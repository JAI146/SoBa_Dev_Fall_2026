import { z } from "zod";

const policyAgreementField = z
  .union([z.boolean(), z.string()])
  .refine((value) => value === true || value === "true" || value === "on" || value === "1", {
    message: "You must agree to this policy",
  });

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    country: z.string().min(1, "Country is required").max(100),
    state: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    agreeTermsOfUse: policyAgreementField,
    agreePrivacyPolicy: policyAgreementField,
    agreeDirectSponsorshipPolicy: policyAgreementField,
    agreeCommunicationPolicy: policyAgreementField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const verifyResetOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    otp: z
      .string()
      .length(6, "OTP must be 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only numbers"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resendResetOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ResendResetOtpInput = z.infer<typeof resendResetOtpSchema>;

export interface ForgotPasswordResponse {
  success: true;
  email: string;
  message: string;
}

export interface VerifyResetOtpResponse {
  success: true;
  message: string;
}

export interface ResetPasswordResponse {
  success: true;
  message: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    userType: string;
    status: string;
    adminRole?: string | null;
    permissions?: string[];
  };
  accessToken: string;
}

export interface RegisterPendingResponse {
  requiresVerification: true;
  email: string;
  message: string;
}
