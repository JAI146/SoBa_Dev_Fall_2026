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
  UseGuards,
} from "@nestjs/common";
import {
  createProfileUpdateRequestSchema,
  reviewProfileUpdateRequestSchema,
  AdminPermission,
} from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { FamilyGuard } from "../auth/family.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { FamilyProfileUpdatesService } from "./family-profile-updates.service";

@Controller("family/profile")
@UseGuards(JwtAuthGuard, FamilyGuard)
export class FamilyProfileController {
  constructor(
    private readonly profileUpdatesService: FamilyProfileUpdatesService,
  ) {}

  @Get()
  getProfile(@Req() req: { user: { sub: string } }) {
    return this.profileUpdatesService.getProfileForFamilyUser(req.user.sub);
  }

  @Get("update-requests")
  listRequests(@Req() req: { user: { sub: string } }) {
    return this.profileUpdatesService.listForFamilyUser(req.user.sub);
  }

  @Post("update-requests")
  createRequest(
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = createProfileUpdateRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.profileUpdatesService.createForFamilyUser(
      req.user.sub,
      parsed.data,
    );
  }
}

@Controller("admin/profile-update-requests")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class AdminProfileUpdateRequestsController {
  constructor(
    private readonly profileUpdatesService: FamilyProfileUpdatesService,
  ) {}

  @Get()
  @RequirePermissions(AdminPermission.PROFILE_UPDATES_REVIEW)
  list(
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.profileUpdatesService.listForAdmin({ status, search });
  }

  @Patch(":id")
  @RequirePermissions(AdminPermission.PROFILE_UPDATES_REVIEW)
  review(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = reviewProfileUpdateRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.profileUpdatesService.reviewForAdmin(
      id,
      req.user.sub,
      parsed.data,
    );
  }
}
