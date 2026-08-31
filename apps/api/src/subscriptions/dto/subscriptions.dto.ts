import { createUpgradeIntentSchema } from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class CreateUpgradeIntentDto extends zodDto(createUpgradeIntentSchema) {}
