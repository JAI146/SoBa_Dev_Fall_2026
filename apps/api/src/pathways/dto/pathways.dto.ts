import { createPathwayApplicationSchema, selectPathwayPartnersSchema, updateChecklistItemSchema, verifyPathwayApplicationSchema } from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';
export class CreatePathwayApplicationDto extends zodDto(createPathwayApplicationSchema) {}
export class VerifyPathwayApplicationDto extends zodDto(verifyPathwayApplicationSchema) {}
export class SelectPathwayPartnersDto extends zodDto(selectPathwayPartnersSchema) {}
export class UpdateChecklistItemDto extends zodDto(updateChecklistItemSchema) {}
