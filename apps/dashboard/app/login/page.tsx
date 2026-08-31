"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ClientType,
  UserType,
  type AuthResponse,
  type MessageResponse,
  type RegisterPendingResponse,
} from "@purposemint/contracts";
import { EmailVerificationStep } from "@/components/auth/email-verification-step";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthPageTitle } from "@/components/auth/auth-page-title";
import { IconInput } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import {
  getRememberedEmail,
  getRememberMePreference,
  clearAuth,
  getStoredUser,
  getToken,
  saveAuth,
  setRememberMePreference,
} from "@/lib/auth";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getToken();
    if (token && storedUser?.userType === UserType.ADMIN) {
      router.replace("/dashboard");
      return;
    }
    if (token || storedUser) clearAuth();
    const remembered = getRememberMePreference();
    setRememberMe(remembered);
    setEmail(remembered ? getRememberedEmail() : "");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<AuthResponse | RegisterPendingResponse>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            clientType: ClientType.DASHBOARD,
          }),
        },
      );
      if (!("accessToken" in data)) {
        setPendingEmail(data.email);
        return;
      }
      await completeSignIn(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function completeSignIn(data: AuthResponse) {
    if (data.user.userType !== UserType.ADMIN) {
      await apiRequest<MessageResponse>(
        "/auth/logout",
        { method: "POST" },
        data.accessToken,
      ).catch(() => undefined);
      clearAuth();
      setPendingEmail(null);
      setError("Admin access is required to use this dashboard.");
      return;
    }
    saveAuth(data, rememberMe);
    setRememberMePreference(rememberMe, email);
    router.push("/dashboard");
  }

  return (
    <main className={styles["auth-page"]}>
      <div className={styles["auth-card"]}>
        {pendingEmail ? (
          <EmailVerificationStep
            email={pendingEmail}
            onVerified={(data) => void completeSignIn(data)}
          />
        ) : (
          <>
            <AuthPageTitle icon="login">Sign In</AuthPageTitle>
            <p className={styles.subtitle}>
              Sign in to continue to your account.
            </p>
            {error && <div className={styles["error-banner"]}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className={styles["form-group"]}>
                <label htmlFor="email">Email address</label>
                <IconInput
                  icon="email"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <PasswordInput
                id="password"
                name="password"
                label="Password"
                required
                value={password}
                onChange={setPassword}
              />
              <div className={styles["password-actions-row"]}>
                <label className={styles["remember-label"]}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  Remember me
                </label>
                <Link
                  className={styles["forgot-password-link"]}
                  href="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit"
                className={styles["btn-primary"]}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <div className={styles["auth-footer"]}>
              New to PurposeMint?{" "}
              <Link href="/register">Create an account</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
