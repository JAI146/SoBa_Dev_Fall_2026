"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type {
  ForgotPasswordResponse,
  ResetPasswordResponse,
  VerifyResetOtpResponse,
} from "@muakhah/contracts";
import { OtpInput } from "@/components/auth/otp-input";
import { AuthPageTitle } from "@/components/auth/auth-page-title";
import { PasswordInput } from "@/components/auth/password-input";
import { IconInput } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import { isAuthenticated } from "@/lib/auth";
import styles from "../auth.module.css";

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      await apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setEmail(normalizedEmail);
      setStep("otp");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.forgotPassword.emailStepFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiRequest<VerifyResetOtpResponse>("/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.forgotPassword.otpFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    setResent(false);
    setResending(true);

    try {
      await apiRequest("/auth/resend-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setOtp("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.forgotPassword.otpResendFailed"),
      );
    } finally {
      setResending(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("auth.register.validation.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("auth.register.validation.password"));
      return;
    }

    setLoading(true);

    try {
      await apiRequest<ResetPasswordResponse>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          otp,
          newPassword,
          confirmPassword,
        }),
      });
      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.forgotPassword.passwordFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles["auth-page"]}>
      <div className={styles["auth-card"]}>
        {step === "email" && (
          <>
            <AuthPageTitle icon="forgot">{t("auth.forgotPassword.title")}</AuthPageTitle>
            <p className={styles.subtitle}>{t("auth.forgotPassword.subtitle")}</p>

            {error && <div className={styles["error-banner"]}>{error}</div>}

            <form onSubmit={handleEmailSubmit}>
              <div className={styles["form-group"]}>
                <label htmlFor="email">{t("auth.login.email")}</label>
                <IconInput
                  icon="email"
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={styles["btn-primary"]}
                disabled={loading}
              >
                {loading
                  ? t("auth.forgotPassword.emailStepSending")
                  : t("auth.forgotPassword.emailStepSubmit")}
              </button>
            </form>

            <div className={styles["auth-footer"]}>
              {t("auth.forgotPassword.rememberPassword")}{" "}
              <Link href="/login">{t("auth.register.login")}</Link>
            </div>
          </>
        )}

        {step === "otp" && (
          <div className={styles["verify-step"]}>
            <div className={styles["verify-icon"]} aria-hidden>
              ✉
            </div>
            <h2 className={styles["verify-title"]}>{t("auth.forgotPassword.otpTitle")}</h2>
            <p className={styles["verify-subtitle"]}>
              {t("auth.forgotPassword.otpSubtitle", { email })}
            </p>

            {error && <div className={styles["error-banner"]}>{error}</div>}
            {resent && (
              <div className={styles["success-banner"]}>
                {t("auth.forgotPassword.otpResent")}
              </div>
            )}

            <form onSubmit={handleOtpSubmit}>
              <label className={styles["verify-otp-label"]}>
                {t("auth.forgotPassword.otpLabel")}
              </label>
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              <button
                type="submit"
                className={styles["btn-primary"]}
                disabled={loading || otp.length !== 6}
              >
                {loading
                  ? t("auth.forgotPassword.otpVerifying")
                  : t("auth.forgotPassword.otpSubmit")}
              </button>
            </form>

            <p className={styles["verify-resend"]}>
              {t("auth.forgotPassword.otpNoCode")}{" "}
              <button
                type="button"
                className={styles["policy-link"]}
                onClick={handleResendOtp}
                disabled={resending}
              >
                {resending
                  ? t("auth.forgotPassword.otpResending")
                  : t("auth.forgotPassword.otpResend")}
              </button>
            </p>

            <div className={styles["auth-footer"]}>
              <button
                type="button"
                className={styles["policy-link"]}
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
              >
                {t("common.back")}
              </button>
            </div>
          </div>
        )}

        {step === "password" && (
          <>
            <h1>{t("auth.forgotPassword.passwordTitle")}</h1>
            <p className={styles.subtitle}>{t("auth.forgotPassword.passwordSubtitle")}</p>

            {error && <div className={styles["error-banner"]}>{error}</div>}

            <form onSubmit={handlePasswordSubmit}>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                label={t("auth.forgotPassword.newPassword")}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={setNewPassword}
              />

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                label={t("auth.forgotPassword.confirmPassword")}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />

              <button
                type="submit"
                className={styles["btn-primary"]}
                disabled={loading}
              >
                {loading
                  ? t("auth.forgotPassword.passwordSaving")
                  : t("auth.forgotPassword.passwordSubmit")}
              </button>
            </form>
          </>
        )}

        {step === "success" && (
          <div className={styles["verify-step"]}>
            <div className={styles["verify-icon"]} aria-hidden>
              ✓
            </div>
            <h2 className={styles["verify-title"]}>{t("auth.forgotPassword.successTitle")}</h2>
            <p className={styles["verify-subtitle"]}>
              {t("auth.forgotPassword.successMessage")}
            </p>

            <Link href="/login" className={styles["btn-primary"]}>
              {t("auth.forgotPassword.backToLogin")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
