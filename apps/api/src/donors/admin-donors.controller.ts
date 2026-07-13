import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  donorListQuerySchema,
  restrictDonorSchema,
  AdminPermission,
} from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { DonorsService } from "./donors.service";

@Controller("admin/donors")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class AdminDonorsController {
  constructor(private readonly donorsService: DonorsService) {}

  @Get()
  @RequirePermissions(AdminPermission.DONORS_READ)
  async list(@Query() query: Record<string, string | undefined>) {
    const parsed = donorListQuerySchema.safeParse({
      search: query.search || undefined,
      status: query.status || undefined,
      userType: query.userType || undefined,
    });

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    const donors = await this.donorsService.listForAdmin(parsed.data);
    return { donors };
  }

  @Get(":id")
  @RequirePermissions(AdminPermission.DONORS_READ)
  async getOne(@Param("id") id: string) {
    const donor = await this.donorsService.findByIdForAdmin(id);
    return { donor };
  }

  @Patch(":id/restrict")
  @RequirePermissions(AdminPermission.DONORS_WRITE)
  async restrict(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = restrictDonorSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    const donor = await this.donorsService.setRestrictedForAdmin(
      id,
      parsed.data.restricted,
    );
    return { donor };
  }

  @Delete(":id")
  @RequirePermissions(AdminPermission.DONORS_WRITE)
  async remove(@Param("id") id: string) {
    return this.donorsService.deleteForAdmin(id);
  }
}
