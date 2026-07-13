import type { UploadedImageFile } from "../common/types/uploaded-file.type";
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
  createSponsorshipSchema,
  reviewSponsorshipSchema,
  stopSponsorshipSchema,
  completeSponsorshipSchema,
  pauseSponsorshipSchema,
  cancelSponsorshipSchema,
  disputeSponsorshipSchema,
  setSponsorshipStatusSchema,
  updateSponsorshipSchema,
  AdminPermission,
} from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { DonorGuard } from "../auth/donor.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SponsorshipsService } from "./sponsorships.service";

@Controller("donor/sponsorships")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorSponsorshipsController {
  constructor(private readonly sponsorshipsService: SponsorshipsService) {}

  @Get()
  list(@Req() req: { user: { sub: string } }) {
    return this.sponsorshipsService.listForDonor(req.user.sub);
  }

  @Get(":id")
  findOne(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    return this.sponsorshipsService.findOneForDonor(req.user.sub, id);
  }

  @Post()
  create(
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = createSponsorshipSchema.safeParse({
      ...body,
      amount:
        body.amount !== undefined && body.amount !== ""
          ? body.amount
          : undefined,
      notes: body.notes ?? "",
      initialMessage: body.initialMessage ?? "",
      pledgeAccepted: body.pledgeAccepted === true ? true : body.pledgeAccepted,
    });

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.createForDonor(req.user.sub, parsed.data);
  }

  @Patch(":id/complete")
  complete(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = completeSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.completeForDonor(req.user.sub, id, parsed.data);
  }

  @Patch(":id/dispute")
  dispute(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = disputeSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.disputeForDonor(req.user.sub, id, parsed.data);
  }

  @Patch(":id/stop")
  stop(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = stopSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.stopForDonor(req.user.sub, id, parsed.data);
  }

  @Patch(":id/pause")
  pause(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = pauseSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.pauseForDonor(req.user.sub, id, parsed.data);
  }

  @Patch(":id/resume")
  resume(@Param("id") id: string, @Req() req: { user: { sub: string } }) {
    return this.sponsorshipsService.resumeForDonor(req.user.sub, id);
  }

  @Patch(":id/cancel")
  cancel(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = cancelSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.cancelForDonor(req.user.sub, id, parsed.data);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateSponsorshipSchema.safeParse({
      ...body,
      amount:
        body.amount !== undefined && body.amount !== ""
          ? body.amount
          : undefined,
      notes: body.notes ?? "",
      initialMessage: body.initialMessage ?? "",
    });

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.updateForDonor(
      req.user.sub,
      id,
      parsed.data,
    );
  }
}

@Controller("admin/sponsorships")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class AdminSponsorshipsController {
  constructor(private readonly sponsorshipsService: SponsorshipsService) {}

  @Get()
  @RequirePermissions(AdminPermission.SPONSORSHIPS_READ)
  list(
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.sponsorshipsService.listForAdmin({ status, search });
  }

  @Patch(":id/status")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  setStatus(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = setSponsorshipStatusSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.setStatusForAdmin(
      req.user.sub,
      id,
      parsed.data,
    );
  }

  @Patch(":id/complete")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  complete(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = completeSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.completeForAdmin(req.user.sub, id, parsed.data);
  }

  @Patch(":id/stop")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  stop(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = stopSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.stopForAdmin(req.user.sub, id, parsed.data);
  }

  @Patch(":id/pause")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  pause(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = pauseSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.pauseForAdmin(req.user.sub, id, parsed.data);
  }

  @Patch(":id/resume")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  resume(@Param("id") id: string, @Req() req: { user: { sub: string } }) {
    return this.sponsorshipsService.resumeForAdmin(req.user.sub, id);
  }

  @Patch(":id/cancel")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  cancel(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = cancelSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.cancelForAdmin(req.user.sub, id, parsed.data);
  }

  @Patch(":id/dispute")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  dispute(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = disputeSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.disputeForAdmin(req.user.sub, id, parsed.data);
  }

  @Patch(":id")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  review(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = reviewSponsorshipSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    return this.sponsorshipsService.reviewForAdmin(
      id,
      req.user.sub,
      parsed.data,
    );
  }
}
