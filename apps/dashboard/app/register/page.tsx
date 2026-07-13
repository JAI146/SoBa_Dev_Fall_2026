"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import {
  legalDocumentSlugs,
  type AuthResponse,
  type LegalDocumentPublic,
  type LegalDocumentSlugValue,
  type RegisterPendingResponse,
} from "@muakhah/contracts";
import { EmailVerificationStep } from "@/components/auth/email-verification-step";
import { AuthPageTitle } from "@/components/auth/auth-page-title";
import { LocationFields } from "@/components/auth/location-fields";
import { PasswordInput } from "@/components/auth/password-input";
import { IconInput } from "@/components/forms/icon-field";
import { PolicyViewerModal } from "@/components/auth/policy-viewer-modal";
import { apiRequest } from "@/lib/api-client";
import { getDashboardPath, saveAuth } from "@/lib/auth";
import {
  buildRegisterFormData,
  emptyRegisterFormValues,
  type RegisterFormValues,
  validateRegisterForm,
} from "@/lib/register-form-validation";
import styles from "../auth.module.css";

const POLICY_FIELDS: {
  slug: LegalDocumentSlugValue;
  name: keyof Pick<
    RegisterFormValues,
    | "agreeTermsOfUse"
    | "agreePrivacyPolicy"
    | "agreeDirectSponsorshipPolicy"
    | "agreeCommunicationPolicy"
  >;
  labelKey: string;
}[] = [
  {
    slug: "terms_of_use",
    name: "agreeTermsOfUse",
    labelKey: "auth.register.agreeTermsOfUse",
  },
  {
    slug: "privacy_policy",
    name: "agreePrivacyPolicy",
    labelKey: "auth.register.agreePrivacyPolicy",
  },
  {
    slug: "direct_sponsorship_policy",
    name: "agreeDirectSponsorshipPolicy",
    labelKey: "auth.register.agreeDirectSponsorshipPolicy",
  },
  {
    slug: "communication_policy",
    name: "agreeCommunicationPolicy",
    labelKey: "auth.register.agreeCommunicationPolicy",
  },
];

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
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<RegisterFormValues>(emptyRegisterFormValues);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [policies, setPolicies] = useState<Record<string, LegalDocumentPublic>>(
    {},
  );
  const [viewingPolicy, setViewingPolicy] = useState<LegalDocumentPublic | null>(
    null,
  );
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const { isComplete, errors: validationErrors } = useMemo(
    () => validateRegisterForm(form, t),
    [form, t],
  );

  function setField<K extends keyof RegisterFormValues>(
    key: K,
    value: RegisterFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    async function loadPolicies() {
      try {
        const data = await apiRequest<{ documents: LegalDocumentPublic[] }>(
          "/legal",
        );
        const map: Record<string, LegalDocumentPublic> = {};
        for (const doc of data.documents) {
          map[doc.slug] = doc;
        }
        setPolicies(map);
      } catch {
        const map: Record<string, LegalDocumentPublic> = {};
        for (const slug of legalDocumentSlugs) {
          map[slug] = {
            slug,
            contentEn: "",
            contentAr: "",
            updatedAt: new Date().toISOString(),
          };
        }
        setPolicies(map);
      }
    }
    void loadPolicies();
  }, []);

  function assignFile(file: File) {
    const input = fileInputRef.current;
    if (!input || !file.type.startsWith("image/")) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileChange(file);
  }

  function handleFileChange(file: File | undefined) {
    if (!file) {
      setPreview(null);
      setFileName(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isComplete) return;

    setSubmitError(null);
    setLoading(true);

    const profileImage = fileInputRef.current?.files?.[0];
    const formData = buildRegisterFormData(form, profileImage);

    try {
      const data = await apiRequest<AuthResponse | RegisterPendingResponse>(
        "/auth/register",
        {
          method: "POST",
          body: formData,
        },
      );

      if ("requiresVerification" in data && data.requiresVerification) {
        setPendingEmail(data.email);
        return;
      }

      const auth = data as AuthResponse;
      saveAuth(auth, true, {
        email: form.email.trim(),
        password: form.password,
      });
      router.push(getDashboardPath(auth.user.userType));
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("auth.register.failed"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleVerified(data: AuthResponse) {
    saveAuth(data, true);
    router.push(getDashboardPath(data.user.userType));
  }

  const showValidationErrors = !isComplete && validationErrors.length > 0;

  return (
    <div className={`${styles["auth-page"]} ${styles["auth-page--register"]}`}>
      <div className={`${styles["auth-card"]} ${styles["auth-card--register"]}`}>
        {pendingEmail ? (
          <EmailVerificationStep email={pendingEmail} onVerified={handleVerified} />
        ) : (
          <>
        <AuthPageTitle icon="register">{t("auth.register.title")}</AuthPageTitle>
        <p className={styles.subtitle}>{t("auth.register.subtitle")}</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles["form-group"]}>
            <label htmlFor="firstName">{t("auth.register.firstName")}</label>
            <IconInput
              icon="user"
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
          </div>

          <div className={styles["form-group"]}>
            <label htmlFor="lastName">{t("auth.register.lastName")}</label>
            <IconInput
              icon="users"
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
            />
          </div>

          <div className={styles["form-group"]}>
            <label htmlFor="email">{t("auth.register.email")}</label>
            <IconInput
              icon="email"
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          <PasswordInput
            id="password"
            name="password"
            label={t("auth.register.password")}
            value={form.password}
            onChange={(value) => setField("password", value)}
            autoComplete="new-password"
          />

          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label={t("auth.register.confirmPassword")}
            value={form.confirmPassword}
            onChange={(value) => setField("confirmPassword", value)}
            autoComplete="new-password"
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
              {t("auth.register.profileImage")}{" "}
              <span className={styles.optional}>{t("auth.register.optional")}</span>
            </span>
            <input
              ref={fileInputRef}
              id="profileImage"
              name="profileImage"
              type="file"
              accept="image/*"
              className={styles["file-input-hidden"]}
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <label
              htmlFor="profileImage"
              className={`${styles["file-upload-zone"]} ${preview ? styles["has-file"] : ""} ${dragOver ? styles["drag-over"] : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                assignFile(e.dataTransfer.files[0]!);
              }}
            >
              {preview ? (
                <div className={styles["file-preview-wrap"]}>
                  <img
                    src={preview}
                    alt={t("auth.register.profilePreviewAlt")}
                    className={styles["image-preview"]}
                  />
                  <div className={styles["file-preview-info"]}>
                    <div className={styles["file-preview-name"]}>
                      {fileName}
                    </div>
                    <div className={styles["file-preview-change"]}>
                      {t("auth.register.changePhoto")}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles["file-upload-icon"]}>
                    <UploadIcon />
                  </div>
                  <div className={styles["file-upload-title"]}>
                    {t("auth.register.uploadPhoto")}
                  </div>
                  <div className={styles["file-upload-hint"]}>
                    {t("auth.register.uploadHint")}
                  </div>
                </>
              )}
            </label>
          </div>

          <fieldset className={styles["policy-agreements"]}>
            <legend>{t("auth.register.policiesLegend")}</legend>
            {POLICY_FIELDS.map(({ slug, name, labelKey }) => (
              <label key={slug} className={styles["policy-agreement-row"]}>
                <input
                  type="checkbox"
                  name={name}
                  checked={form[name]}
                  onChange={(e) => setField(name, e.target.checked)}
                />
                <span>
                  {t(labelKey)}{" "}
                  <button
                    type="button"
                    className={styles["policy-link"]}
                    onClick={() => {
                      const doc = policies[slug] ?? {
                        slug,
                        contentEn: "",
                        contentAr: "",
                        updatedAt: new Date().toISOString(),
                      };
                      setViewingPolicy(doc);
                    }}
                  >
                    {t(`admin.legal.policies.${slug}`)}
                  </button>
                </span>
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            className={styles["btn-primary"]}
            disabled={loading || !isComplete}
          >
            {loading ? t("auth.register.creating") : t("auth.register.submit")}
          </button>

          {(submitError || showValidationErrors) && (
            <div className={styles["form-errors"]} role="alert">
              {submitError && (
                <div className={styles["error-banner"]}>{submitError}</div>
              )}
              {showValidationErrors && (
                <>
                  <p className={styles["form-errors-title"]}>
                    {t("auth.register.validation.incomplete")}
                  </p>
                  <ul className={styles["form-errors-list"]}>
                    {validationErrors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </form>

        <div className={styles["auth-footer"]}>
          {t("auth.register.hasAccount")}{" "}
          <a href="/login">{t("auth.register.login")}</a>
        </div>
          </>
        )}
      </div>

      <PolicyViewerModal
        document={viewingPolicy}
        onClose={() => setViewingPolicy(null)}
      />
    </div>
  );
}
