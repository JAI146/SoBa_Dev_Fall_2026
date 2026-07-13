"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { AuthResponse } from "@muakhah/contracts";
import { OtpInput } from "@/components/auth/otp-input";
import { apiRequest } from "@/lib/api-client";
import styles from "../../app/auth.module.css";

type EmailVerificationStepProps = {
  email: string;
  onVerified: (data: AuthResponse) => void;
};

export function EmailVerificationStep({
  email,
  onVerified,
}: EmailVerificationStepProps) {
  const { t } = useI18n();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<AuthResponse>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      onVerified(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.verify.failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    setResending(true);

    try {
      await apiRequest("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.verify.resendFailed"));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles["verify-step"]}>
      <div className={styles["verify-icon"]} aria-hidden>
        ✉
      </div>
      <h2 className={styles["verify-title"]}>{t("auth.verify.title")}</h2>
      <p className={styles["verify-subtitle"]}>
        {t("auth.verify.subtitle", { email })}
      </p>

      {error && <div className={styles["error-banner"]}>{error}</div>}
      {resent && (
        <div className={styles["success-banner"]}>{t("auth.verify.resent")}</div>
      )}

      <form onSubmit={handleVerify}>
        <label className={styles["verify-otp-label"]}>{t("auth.verify.codeLabel")}</label>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />

        <button
          type="submit"
          className={styles["btn-primary"]}
          disabled={loading || otp.length !== 6}
        >
          {loading ? t("auth.verify.verifying") : t("auth.verify.submit")}
        </button>
      </form>

      <p className={styles["verify-resend"]}>
        {t("auth.verify.noCode")}{" "}
        <button
          type="button"
          className={styles["policy-link"]}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? t("auth.verify.resending") : t("auth.verify.resend")}
        </button>
      </p>
    </div>
  );
}
