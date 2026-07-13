import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  createFamilySchema,
  hideFamilySchema,
  restrictFamilySchema,
  updateFamilySchema,
  updateFamilyMediaVisibilitySchema,
  AdminPermission,
} from "@muakhah/contracts";
import type { UploadedMediaFile } from "../common/types/uploaded-file.type";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { FamiliesService } from "./families.service";

@Controller("admin/families")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class AdminFamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  @RequirePermissions(AdminPermission.FAMILIES_READ)
  async list() {
    const families = await this.familiesService.listForAdmin();
    return { families };
  }

  @Get("export")
  @RequirePermissions(AdminPermission.FAMILIES_READ)
  async exportList() {
    const families = await this.familiesService.listDetailsForAdmin();
    return { families };
  }

  @Get(":id")
  @RequirePermissions(AdminPermission.FAMILIES_READ)
  async getOne(@Param("id") id: string) {
    const family = await this.familiesService.findByIdForAdmin(id);
    return { family };
  }

  @Post()
  @RequirePermissions(AdminPermission.FAMILIES_WRITE)
  @UseInterceptors(
    FilesInterceptor("media", 10, {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async create(
    @Body("payload") payloadJson: string,
    @UploadedFiles() media: UploadedMediaFile[] | undefined,
    @Req() req: { user: { sub: string } },
  ) {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(payloadJson) as Record<string, unknown>;
    } catch {
      throw new BadRequestException("Invalid family payload JSON");
    }

    const parsed = createFamilySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    for (const file of media ?? []) {
      const isMedia =
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/");
      if (!isMedia) {
        throw new BadRequestException("Media files must be images or videos");
      }
    }

    const family = await this.familiesService.createForAdmin(
      parsed.data,
      req.user.sub,
      media ?? [],
    );
    return { family };
  }

  @Patch(":id/restrict")
  @RequirePermissions(AdminPermission.FAMILIES_WRITE)
  async restrict(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = restrictFamilySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    const family = await this.familiesService.setRestrictedForAdmin(
      id,
      parsed.data.restricted,
    );
    return { family };
  }

  @Patch(":id/hide")
  @RequirePermissions(AdminPermission.FAMILIES_WRITE)
  async hide(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: { user: { sub: string } },
  ) {
    const parsed = hideFamilySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    const family = await this.familiesService.setHiddenForAdmin(
      id,
      parsed.data.hidden,
      req.user.sub,
    );
    return { family };
  }

  @Patch(":id/media")
  @RequirePermissions(AdminPermission.FAMILIES_WRITE)
  async updateMedia(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateFamilyMediaVisibilitySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    const family = await this.familiesService.updateMediaVisibility(
      id,
      parsed.data.items,
    );
    return { family };
  }

  @Patch(":id")
  @RequirePermissions(AdminPermission.FAMILIES_WRITE)
  async update(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateFamilySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    const family = await this.familiesService.updateForAdmin(id, parsed.data);
    return { family };
  }

  @Delete(":id")
  @RequirePermissions(AdminPermission.FAMILIES_WRITE)
  async remove(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
  ) {
    return this.familiesService.deleteForAdmin(id, req.user.sub);
  }
}
