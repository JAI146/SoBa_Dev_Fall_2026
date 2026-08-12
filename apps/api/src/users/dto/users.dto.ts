import {
  profileImageUploadSchema,
  recordPolicyAgreementSchema,
  updateNotificationPreferencesSchema,
  updateProfileSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

export class UpdateProfileDto extends zodDto(updateProfileSchema) {}
export class UpdateNotificationPreferencesDto extends zodDto(
  updateNotificationPreferencesSchema,
) {}
export class RecordPolicyAgreementDto extends zodDto(
  recordPolicyAgreementSchema,
) {}
export class ProfileImageUploadDto extends zodDto(profileImageUploadSchema) {}
