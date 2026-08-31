import {
  saveOnboardingHabitsSchema,
  saveOnboardingValuesSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class SaveOnboardingValuesDto extends zodDto(
  saveOnboardingValuesSchema,
) {}
export class SaveOnboardingHabitsDto extends zodDto(
  saveOnboardingHabitsSchema,
) {}
