import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AdminPermission,
  UserType,
  pathwayCatalogUpdateSchema,
  partnerCatalogInputSchema,
  partnerCatalogUpdateSchema,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { zodDto } from '../common/pipes/zod-validation.pipe';
import { PathwayManagementService } from './pathway-management.service';

class PathwayUpdateDto extends zodDto(pathwayCatalogUpdateSchema) {}
class PartnerCreateDto extends zodDto(partnerCatalogInputSchema) {}
class PartnerUpdateDto extends zodDto(partnerCatalogUpdateSchema) {}

@Controller('admin/pathway-management')
@Roles(UserType.ADMIN)
export class PathwayManagementController {
  constructor(private readonly service: PathwayManagementService) {}
  @Get()
  @RequirePermission(AdminPermission.FINANCIAL_DATA_VIEW)
  list(@CurrentUser() principal: AuthPrincipal) {
    return this.service.list(principal);
  }

  @Patch('pathways/:key')
  @RequirePermission(AdminPermission.PATHWAY_APPLICATIONS_EDIT)
  updatePathway(
    @Param('key') key: string,
    @Body() input: PathwayUpdateDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.updatePathway(key, input, principal.userId);
  }

  @Post('partners')
  @RequirePermission(AdminPermission.PATHWAY_APPLICATIONS_EDIT)
  createPartner(
    @Body() input: PartnerCreateDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.createPartner(input, principal.userId);
  }

  @Patch('partners/:id')
  @RequirePermission(AdminPermission.PATHWAY_APPLICATIONS_EDIT)
  updatePartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PartnerUpdateDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.updatePartner(id, input, principal.userId);
  }
}
