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
  createSubAdminSchema,
  updateSubAdminSchema,
  AdminPermission,
} from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { AdminRoleEnum } from "../entities/user.entity";
import { SubAdminsService } from "./sub-admins.service";

@Controller("admin/sub-admins")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermissions(AdminPermission.SUB_ADMINS_MANAGE)
export class AdminSubAdminsController {
  constructor(private readonly subAdminsService: SubAdminsService) {}

  @Get()
  list() {
    return this.subAdminsService.list();
  }

  @Post()
  create(
    @Req() req: { user: { sub: string; adminRole?: AdminRoleEnum | null } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = createSubAdminSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.subAdminsService.create(
      req.user.sub,
      req.user.adminRole ?? null,
      parsed.data,
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Req() req: { user: { sub: string; adminRole?: AdminRoleEnum | null } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateSubAdminSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.subAdminsService.update(
      id,
      req.user.sub,
      req.user.adminRole ?? null,
      parsed.data,
    );
  }
}
