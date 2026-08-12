import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@purposemint/contracts';
import { zodDto } from '../../common/pipes/zod-validation.pipe';

/**
 * Request shapes are defined once in `@purposemint/contracts` and wrapped here
 * only so Nest has a metatype to hang the schema on. No validation rules live
 * in this file.
 */
export class RegisterDto extends zodDto(registerSchema) {}
export class VerifyEmailDto extends zodDto(verifyEmailSchema) {}
export class ResendVerificationDto extends zodDto(resendVerificationSchema) {}
export class LoginDto extends zodDto(loginSchema) {}
export class RefreshDto extends zodDto(refreshSchema) {}
export class ForgotPasswordDto extends zodDto(forgotPasswordSchema) {}
export class ResetPasswordDto extends zodDto(resetPasswordSchema) {}
export class ChangePasswordDto extends zodDto(changePasswordSchema) {}
