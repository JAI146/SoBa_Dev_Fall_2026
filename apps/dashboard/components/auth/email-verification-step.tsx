"use client";

import { FormEvent, useState } from "react";
import {
  ClientType,
  type AuthResponse,
  type MessageResponse,
} from "@purposemint/contracts";
import { OtpInput } from "@/components/auth/otp-input";
import { apiRequest } from "@/lib/api-client";
import styles from "../../app/auth.module.css";

export function EmailVerificationStep({
  email,
  onVerified,
}: {
  email: string;
  onVerified: (data: AuthResponse) => void;
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<AuthResponse>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email,
          otp,
          clientType: ClientType.DASHBOARD,
        }),
      });
      onVerified(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to verify your email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    setResending(true);
    try {
      await apiRequest<MessageResponse>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setOtp("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to resend the code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles["verify-step"]}>
      <div className={styles["verify-icon"]} aria-hidden>
        ✉
      </div>
      <h2 className={styles["verify-title"]}>Verify your email</h2>
      <p className={styles["verify-subtitle"]}>
        Enter the six-digit code sent to {email}.
      </p>
      {error && <div className={styles["error-banner"]}>{error}</div>}
      {resent && (
        <div className={styles["success-banner"]}>
          A new code has been sent.
        </div>
      )}
      <form onSubmit={handleVerify}>
        <label className={styles["verify-otp-label"]}>Verification code</label>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
        <button
          type="submit"
          className={styles["btn-primary"]}
          disabled={loading || otp.length !== 6}
        >
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>
      <p className={styles["verify-resend"]}>
        Did not receive a code?{" "}
        <button
          type="button"
          className={styles["policy-link"]}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </p>
    </div>
  );
}
