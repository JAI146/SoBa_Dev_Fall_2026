"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/auth/otp-input";
import { AuthPageTitle } from "@/components/auth/auth-page-title";
import { PasswordInput } from "@/components/auth/password-input";
import { IconInput } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import { isAuthenticated } from "@/lib/auth";
import styles from "../auth.module.css";

type Step = "request" | "verify" | "reset" | "complete";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const data = await apiRequest<{ message?: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmail(email.trim());
      setMessage(data.message ?? "If the account exists, a reset code has been sent.");
      setStep("verify");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to request a password reset.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await apiRequest("/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      setStep("reset");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await apiRequest("/auth/resend-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setOtp("");
      setMessage("A new reset code has been sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resend the code.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      setStep("complete");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to reset your password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles["auth-page"]}>
      <div className={styles["auth-card"]}>
        <AuthPageTitle icon="forgot">Reset Password</AuthPageTitle>
        <p className={styles.subtitle}>
          {step === "request"
            ? "Enter your email address to receive a reset code."
            : step === "complete"
              ? "Your password has been updated."
              : "Complete the secure password reset steps below."}
        </p>
        {error && <div className={styles["error-banner"]}>{error}</div>}
        {message && <div className={styles["success-banner"]}>{message}</div>}

        {step === "request" && (
          <form onSubmit={requestReset}>
            <div className={styles["form-group"]}>
              <label htmlFor="email">Email address</label>
              <IconInput
                icon="email"
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button className={styles["btn-primary"]} disabled={loading}>
              {loading ? "Sending..." : "Send reset code"}
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={verifyCode}>
            <label className={styles["verify-otp-label"]}>Reset code</label>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            <button
              className={styles["btn-primary"]}
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
            <p className={styles["verify-resend"]}>
              Need another code?{" "}
              <button
                type="button"
                className={styles["policy-link"]}
                onClick={resendCode}
                disabled={loading}
              >
                Resend code
              </button>
            </p>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword}>
            <PasswordInput
              id="password"
              name="password"
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
            />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <button className={styles["btn-primary"]} disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {step === "complete" && (
          <Link className={styles["btn-primary"]} href="/login">
            Return to sign in
          </Link>
        )}

        {step !== "complete" && (
          <div className={styles["auth-footer"]}>
            <Link href="/login">Back to sign in</Link>
          </div>
        )}
      </div>
    </main>
  );
}
