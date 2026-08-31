import {
  createSavingsSchema,
  updateGoalSchema,
  updateHabitsSchema,
  updateValuesSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class CreateSavingsDto extends zodDto(createSavingsSchema) {}
export class UpdateGoalDto extends zodDto(updateGoalSchema) {}
export class UpdateHabitsDto extends zodDto(updateHabitsSchema) {}
export class UpdateValuesDto extends zodDto(updateValuesSchema) {}
