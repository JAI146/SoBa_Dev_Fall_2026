"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { AuthResponse } from "@muakhah/contracts";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthPageTitle } from "@/components/auth/auth-page-title";
import { IconInput } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import {
  getDashboardPath,
  getRememberedEmail,
  getRememberedPassword,
  getRememberMePreference,
  isAuthenticated,
  saveAuth,
  setRememberMePreference,
} from "@/lib/auth";
import styles from "../auth.module.css";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
      return;
    }
    const remembered = getRememberMePreference();
    setRememberMe(remembered);
    if (remembered) {
      const rememberedEmail = getRememberedEmail();
      const rememberedPassword = getRememberedPassword();
      if (rememberedEmail) setEmail(rememberedEmail);
      if (rememberedPassword) setPassword(rememberedPassword);
    }
  }, [router]);

  function handleRememberChange(checked: boolean) {
    setRememberMe(checked);
    setRememberMePreference(checked);
    if (checked) {
      const rememberedEmail = getRememberedEmail();
      const rememberedPassword = getRememberedPassword();
      if (rememberedEmail) setEmail(rememberedEmail);
      if (rememberedPassword) setPassword(rememberedPassword);
    } else {
      setPassword("");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const data = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      saveAuth(
        data,
        rememberMe,
        rememberMe ? { email: normalizedEmail, password } : undefined,
      );
      router.push(getDashboardPath(data.user.userType));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles["auth-page"]}>
      <div className={styles["auth-card"]}>
        <AuthPageTitle icon="login">{t("auth.login.title")}</AuthPageTitle>
        <p className={styles.subtitle}>{t("auth.login.subtitle")}</p>

        {error && <div className={styles["error-banner"]}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="email">{t("auth.login.email")}</label>
            <IconInput
              icon="email"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <PasswordInput
            id="password"
            name="password"
            label={t("auth.login.password")}
            required
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />

          <div className={styles["password-actions-row"]}>
            <div className={styles["remember-row"]}>
              <label className={styles["remember-label"]}>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                />
                {t("auth.login.rememberMe")}
              </label>
            </div>
            <a href="/forgot-password" className={styles["forgot-password-link"]}>
              {t("auth.login.forgotPassword")}
            </a>
          </div>

          <button
            type="submit"
            className={styles["btn-primary"]}
            disabled={loading}
          >
            {loading ? t("auth.login.signingIn") : t("auth.login.submit")}
          </button>
        </form>

        <div className={styles["auth-footer"]}>
          <a href="/register">{t("auth.login.createAccount")}</a>
        </div>
      </div>
    </div>
  );
}
