"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  UserType,
  type AuthResponse,
  type MessageResponse,
  type RegisterPendingResponse,
} from "@purposemint/contracts";
import { EmailVerificationStep } from "@/components/auth/email-verification-step";
import { AuthPageTitle } from "@/components/auth/auth-page-title";
import { LocationFields } from "@/components/auth/location-fields";
import { PasswordInput } from "@/components/auth/password-input";
import { IconInput } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import { clearAuth, saveAuth } from "@/lib/auth";
import {
  buildRegisterInput,
  emptyRegisterFormValues,
  type RegisterFormValues,
  validateRegisterForm,
} from "@/lib/register-form-validation";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormValues>(emptyRegisterFormValues);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      const data = await apiRequest<RegisterPendingResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterInput(form)),
      });
      setPendingEmail(data.email);
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

  async function handleVerified(data: AuthResponse) {
    if (data.user.userType !== UserType.ADMIN) {
      await apiRequest<MessageResponse>(
        "/auth/logout",
        { method: "POST" },
        data.accessToken,
      ).catch(() => undefined);
      clearAuth();
      setPendingEmail(null);
      setSubmitError(
        "Your account is verified, but admin access is required to use this dashboard.",
      );
      return;
    }
    saveAuth(data, true);
    router.push("/dashboard");
  }

  return (
    <main
      className={[styles["auth-page"], styles["auth-page--register"]].join(" ")}
    >
      <div
        className={[styles["auth-card"], styles["auth-card--register"]].join(
          " ",
        )}
      >
        {pendingEmail ? (
          <EmailVerificationStep
            email={pendingEmail}
            onVerified={handleVerified}
          />
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
                  onChange={(event) =>
                    setField("firstName", event.target.value)
                  }
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
