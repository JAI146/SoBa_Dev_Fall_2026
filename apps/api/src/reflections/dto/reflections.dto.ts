import {
  createMoodEntrySchema,
  createReflectionSchema,
  reflectionListQuerySchema,
  updateReflectionSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';
export class CreateReflectionDto extends zodDto(createReflectionSchema) {}
export class UpdateReflectionDto extends zodDto(updateReflectionSchema) {}
export class CreateMoodEntryDto extends zodDto(createMoodEntrySchema) {}
export class ReflectionListQueryDto extends zodDto(reflectionListQuerySchema) {}
