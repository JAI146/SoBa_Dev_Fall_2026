import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { updateLegalDocumentSchema, AdminPermission } from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { LegalService } from "./legal.service";

@Controller("admin/legal-documents")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
export class AdminLegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get()
  @RequirePermissions(AdminPermission.LEGAL_READ)
  async list() {
    const documents = await this.legalService.listForAdmin();
    return { documents };
  }

  @Get(":slug")
  @RequirePermissions(AdminPermission.LEGAL_READ)
  async getOne(@Param("slug") slug: string) {
    const document = await this.legalService.getBySlugForAdmin(slug);
    return { document };
  }

  @Put(":slug")
  @RequirePermissions(AdminPermission.LEGAL_WRITE)
  async update(
    @Param("slug") slug: string,
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateLegalDocumentSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    const document = await this.legalService.upsertForAdmin(slug, parsed.data);
    return { document };
  }
}
