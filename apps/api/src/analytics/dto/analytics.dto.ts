import {
  adminAnalyticsExportParamsSchema,
  adminAnalyticsQuerySchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class AdminAnalyticsQueryDto extends zodDto(adminAnalyticsQuerySchema) {}

export class AdminAnalyticsExportParamsDto extends zodDto(
  adminAnalyticsExportParamsSchema,
) {}
