import {
  createSavingsSchema,
  updateGoalSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class CreateSavingsDto extends zodDto(createSavingsSchema) {}
export class UpdateGoalDto extends zodDto(updateGoalSchema) {}
