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
  activityLogQuerySchema,
  AdminPermission,
} from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { ActivityLogService } from "../activity-logs/activity-log.service";

@Controller("admin/activity-logs")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermissions(AdminPermission.ACTIVITY_LOGS_READ)
export class AdminActivityLogsController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    const parsed = activityLogQuerySchema.safeParse(query);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.activityLogService.listForAdmin(parsed.data);
  }
}
