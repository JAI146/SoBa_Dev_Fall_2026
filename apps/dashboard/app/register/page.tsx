"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import type { AuthResponse } from "@muakhah/contracts";
import { EmailVerificationStep } from "@/components/auth/email-verification-step";
import { AuthPageTitle } from "@/components/auth/auth-page-title";
import { LocationFields } from "@/components/auth/location-fields";
import { PasswordInput } from "@/components/auth/password-input";
import { IconInput } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import { saveAuth } from "@/lib/auth";
import {
  buildRegisterFormData,
  emptyRegisterFormValues,
  type RegisterFormValues,
  validateRegisterForm,
} from "@/lib/register-form-validation";
import styles from "../auth.module.css";

type RegisterPendingResponse = {
  requiresVerification: true;
  email: string;
  message: string;
};

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<RegisterFormValues>(emptyRegisterFormValues);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const validation = useMemo(() => validateRegisterForm(form), [form]);

  function setField<Key extends keyof RegisterFormValues>(
    key: Key,
    value: RegisterFormValues[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation.isComplete) return;
    setSubmitError(null);
    setLoading(true);
    try {
      const data = await apiRequest<AuthResponse | RegisterPendingResponse>(
        "/auth/register",
        {
          method: "POST",
          body: buildRegisterFormData(
            form,
            fileInputRef.current?.files?.[0],
          ),
        },
      );
      if (!("accessToken" in data)) {
        setPendingEmail(data.email);
        return;
      }
      saveAuth(data, true);
      router.push("/dashboard");
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleVerified(data: AuthResponse) {
    saveAuth(data, true);
    router.push("/dashboard");
  }

  return (
    <main className={[styles["auth-page"], styles["auth-page--register"]].join(" ")}>
      <div className={[styles["auth-card"], styles["auth-card--register"]].join(" ")}>
        {pendingEmail ? (
          <EmailVerificationStep email={pendingEmail} onVerified={handleVerified} />
        ) : (
          <>
            <AuthPageTitle icon="register">Create Account</AuthPageTitle>
            <p className={styles.subtitle}>Create your PurposeMint account.</p>
            <form onSubmit={handleSubmit} noValidate>
              <div className={styles["form-group"]}>
                <label htmlFor="firstName">First name</label>
                <IconInput
                  icon="user"
                  id="firstName"
                  value={form.firstName}
                  onChange={(event) => setField("firstName", event.target.value)}
                />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="lastName">Last name</label>
                <IconInput
                  icon="users"
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="email">Email address</label>
                <IconInput
                  icon="email"
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
              <PasswordInput
                id="password"
                name="password"
                label="Password"
                autoComplete="new-password"
                value={form.password}
                onChange={(value) => setField("password", value)}
              />
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(value) => setField("confirmPassword", value)}
              />
              <LocationFields
                country={form.country}
                state={form.state}
                city={form.city}
                onCountryChange={(value) => setField("country", value)}
                onStateChange={(value) => setField("state", value)}
                onCityChange={(value) => setField("city", value)}
              />

              <div className={styles["file-upload-group"]}>
                <span className={styles["file-upload-label"]}>
                  Profile image <span className={styles.optional}>Optional</span>
                </span>
                <input
                  ref={fileInputRef}
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  className={styles["file-input-hidden"]}
                  onChange={(event) =>
                    setFileName(event.target.files?.[0]?.name ?? null)
                  }
                />
                <label
                  htmlFor="profileImage"
                  className={[
                    styles["file-upload-zone"],
                    fileName ? styles["has-file"] : "",
                  ].join(" ")}
                >
                  <div className={styles["file-upload-icon"]}>
                    <UploadIcon />
                  </div>
                  <div className={styles["file-upload-title"]}>
                    {fileName ?? "Choose a profile photo"}
                  </div>
                  <div className={styles["file-upload-hint"]}>
                    PNG or JPG, up to 5 MB
                  </div>
                </label>
              </div>

              <fieldset className={styles["policy-agreements"]}>
                <legend>Agreements</legend>
                <label className={styles["policy-agreement-row"]}>
                  <input
                    type="checkbox"
                    checked={form.agreeTermsOfUse}
                    onChange={(event) =>
                      setField("agreeTermsOfUse", event.target.checked)
                    }
                  />
                  <span>I agree to the Terms of Use.</span>
                </label>
                <label className={styles["policy-agreement-row"]}>
                  <input
                    type="checkbox"
                    checked={form.agreePrivacyPolicy}
                    onChange={(event) =>
                      setField("agreePrivacyPolicy", event.target.checked)
                    }
                  />
                  <span>I agree to the Privacy Policy.</span>
                </label>
              </fieldset>

              <button
                className={styles["btn-primary"]}
                disabled={loading || !validation.isComplete}
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
              {(submitError || validation.errors.length > 0) && (
                <div className={styles["form-errors"]} role="alert">
                  {submitError && (
                    <div className={styles["error-banner"]}>{submitError}</div>
                  )}
                  {!validation.isComplete && (
                    <ul className={styles["form-errors-list"]}>
                      {validation.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
            <div className={styles["auth-footer"]}>
              Already have an account? <Link href="/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
