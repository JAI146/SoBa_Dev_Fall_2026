import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  AdminPermission,
  createTransferProofSchema,
  reviewTransferProofSchema,
  transferProofQuerySchema,
} from "@muakhah/contracts";
import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import { AdminGuard } from "../auth/admin.guard";
import { DonorGuard } from "../auth/donor.guard";
import { FamilyGuard } from "../auth/family.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { TransferProofsService } from "./transfer-proofs.service";

@Controller("donor/sponsorships/:sponsorshipId/transfer-proofs")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorTransferProofsController {
  constructor(private readonly transferProofsService: TransferProofsService) {}

  @Get()
  list(
    @Req() req: { user: { sub: string } },
    @Param("sponsorshipId") sponsorshipId: string,
  ) {
    return this.transferProofsService.listForDonor(req.user.sub, sponsorshipId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @Req() req: { user: { sub: string } },
    @Param("sponsorshipId") sponsorshipId: string,
    @Body() body: Record<string, string>,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    const parsed = createTransferProofSchema.safeParse({
      notes: body.notes ?? "",
      receivingMethodIndex: body.receivingMethodIndex ?? "0",
      amount: body.amount ?? "",
      transferDate: body.transferDate ?? "",
    });

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    if (!file) {
      throw new BadRequestException("Transfer proof file is required");
    }

    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";
    if (!isImage && !isPdf) {
      throw new BadRequestException("File must be an image or PDF");
    }

    return this.transferProofsService.uploadForDonor(
      req.user.sub,
      sponsorshipId,
      parsed.data,
      file,
    );
  }
}

@Controller("donor/transfer-proofs")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorAllTransferProofsController {
  constructor(private readonly transferProofsService: TransferProofsService) {}

  @Get()
  list(@Req() req: { user: { sub: string } }) {
    return this.transferProofsService.listAllForDonor(req.user.sub);
  }
}

@Controller("family/transfer-proofs")
@UseGuards(JwtAuthGuard, FamilyGuard)
export class FamilyTransferProofsController {
  constructor(private readonly transferProofsService: TransferProofsService) {}

  @Get()
  list(@Req() req: { user: { sub: string } }) {
    return this.transferProofsService.listApprovedForFamily(req.user.sub);
  }
}

@Controller("admin/transfer-proofs")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class AdminTransferProofsController {
  constructor(private readonly transferProofsService: TransferProofsService) {}

  @Get()
  @RequirePermissions(AdminPermission.SPONSORSHIPS_READ)
  list(@Query() query: Record<string, string>) {
    const parsed = transferProofQuerySchema.safeParse(query);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.transferProofsService.listForAdmin(parsed.data);
  }

  @Get(":id")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_READ)
  getOne(@Param("id") id: string) {
    return this.transferProofsService.getOneForAdmin(id);
  }

  @Patch(":id/review")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  review(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = reviewTransferProofSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.transferProofsService.reviewForAdmin(
      req.user.sub,
      id,
      parsed.data,
    );
  }
}
