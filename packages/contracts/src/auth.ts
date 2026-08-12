import { z } from "zod";
import { clientTypeValues } from "./enums";
import type { UserPublic } from "./user";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "We'll need your email address to continue.")
  .max(255)
  .email("That doesn't look like an email address yet — mind checking it?");

const passwordField = z
  .string()
  .min(8, "Passwords need at least 8 characters — a short phrase works well.")
  .max(128, "That password is longer than we can store. 128 characters is our limit.");

const otpField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Your code is the six digits we emailed you.");

/** Accepts a checkbox in any of the shapes a form might send it. */
const agreementField = z
  .union([z.boolean(), z.string()])
  .transform(
    (value) =>
      value === true || value === "true" || value === "on" || value === "1",
  )
  .refine((agreed) => agreed, {
    message:
      "We need your agreement to this before we can set up your account.",
  });

/** Defaults to mobile so a client that forgets to say gets the shorter-lived path wrong-side-safe. */
const clientTypeField = z.enum(clientTypeValues).default("mobile");

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  firstName: z
    .string()
    .trim()
    .min(1, "We'd love a first name to greet you by.")
    .max(100),
  lastName: z
    .string()
    .trim()
    .min(1, "We'd love a last name to go with your first.")
    .max(100),
  country: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  agreeTermsOfUse: agreementField,
  agreePrivacyPolicy: agreementField,
  policyVersion: z.string().trim().min(1).max(50).default("1.0"),
  clientType: clientTypeField,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Pop your password in and we'll take it from here."),
  clientType: clientTypeField,
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  email: emailField,
  otp: otpField,
  clientType: clientTypeField,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: emailField,
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const refreshSchema = z.object({
  /** Mobile sends the token here. The dashboard sends it as an httpOnly cookie. */
  refreshToken: z.string().min(1).optional(),
  clientType: clientTypeField,
});

export type RefreshInput = z.infer<typeof refreshSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: emailField,
  otp: otpField,
  newPassword: passwordField,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Pop your current password in so we know it's you."),
    newPassword: passwordField,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Your new password is the same as your current one — try another.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * What every successful auth call returns.
 * `refreshToken` is present for mobile clients only — dashboard clients get
 * theirs as an httpOnly cookie scoped to `/api/auth/refresh`.
 */
export interface AuthResponse {
  user: UserPublic;
  accessToken: string;
  /** Access-token lifetime in seconds, so clients can refresh ahead of expiry. */
  expiresIn: number;
  refreshToken?: string;
}

export interface MessageResponse {
  message: string;
}
