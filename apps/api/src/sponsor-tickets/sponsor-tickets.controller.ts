import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AdminPermission,
  createSponsorTicketSchema,
  replySponsorTicketSchema,
  updateSponsorTicketStatusSchema,
} from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { DonorGuard } from "../auth/donor.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SponsorTicketsService } from "./sponsor-tickets.service";

@Controller("donor/tickets")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorSponsorTicketsController {
  constructor(private readonly sponsorTicketsService: SponsorTicketsService) {}

  @Get()
  list(@Req() req: { user: { sub: string } }) {
    return this.sponsorTicketsService.listForDonor(req.user.sub);
  }

  @Get(":id")
  findOne(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    return this.sponsorTicketsService.findOneForDonor(req.user.sub, id);
  }

  @Post()
  create(
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = createSponsorTicketSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.sponsorTicketsService.createForDonor(req.user.sub, parsed.data);
  }

  @Post(":id/replies")
  reply(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = replySponsorTicketSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.sponsorTicketsService.replyForDonor(
      req.user.sub,
      id,
      parsed.data,
    );
  }
}

@Controller("admin/tickets")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class AdminSponsorTicketsController {
  constructor(private readonly sponsorTicketsService: SponsorTicketsService) {}

  @Get()
  @RequirePermissions(AdminPermission.SPONSORSHIPS_READ)
  list() {
    return this.sponsorTicketsService.listForAdmin();
  }

  @Get(":id")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_READ)
  findOne(@Param("id") id: string) {
    return this.sponsorTicketsService.findOneForAdmin(id);
  }

  @Post(":id/replies")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  reply(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = replySponsorTicketSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.sponsorTicketsService.replyForAdmin(
      req.user.sub,
      id,
      parsed.data,
    );
  }

  @Patch(":id/status")
  @RequirePermissions(AdminPermission.SPONSORSHIPS_REVIEW)
  updateStatus(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateSponsorTicketStatusSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.sponsorTicketsService.updateStatusForAdmin(
      req.user.sub,
      id,
      parsed.data,
    );
  }
}
