"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { FamilyDetail } from "@muakhah/contracts";
import {
  CaseCategoryOptions,
  DataSourceOptions,
  DisplacementOptions,
  GovernorateOptions,
  HousingOptions,
  IncomeOptions,
  PriorityOptions,
  ProfileStatusOptions,
} from "@/components/admin/family-form-options";
import { BilingualField } from "@/components/admin/bilingual-field";
import { FamilyMediaPreview } from "@/components/admin/family-media-preview";
import { ReadOnlyFormField } from "@/components/admin/read-only-form-field";
import { ReceivingMethodsDisplay } from "@/components/admin/receiving-methods-display";
import { FamilyFundingProgress } from "@/components/donor/family-funding-progress";
import { ReceivingMethodsEditor } from "@/components/admin/receiving-methods-editor";
import { PasswordInput } from "@/components/auth/password-input";
import { IconInput, IconSelect, IconTextarea } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  buildFamilyPayloadFromValues,
  familyDetailToFormValues,
  validateFamilyCounts,
  validateFamilyPayload,
  type FamilyFormValues,
} from "@/lib/family-form";
import { localizedFamilyName } from "@/lib/localized-text";
import styles from "../../../dashboard.module.css";
import authStyles from "../../../../auth.module.css";

const emptyPasswords = {
  accountPassword: "",
  confirmAccountPassword: "",
};

export default function EditFamilyPage() {
  const { t, te, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const familyId = String(params.id ?? "");

  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [form, setForm] = useState<FamilyFormValues | null>(null);
  const [passwords, setPasswords] = useState(emptyPasswords);

  const isArabicLocale = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<{ family: FamilyDetail }>(
          `/admin/families/${familyId}`,
          {},
          getToken(),
        );
        setFamily(data.family);
        setForm(familyDetailToFormValues(data.family));
      } catch (err) {
        setError(err instanceof Error ? err.message : t("families.loadOneFailed"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [familyId, t]);

  function setField<K extends keyof FamilyFormValues>(
    key: K,
    value: FamilyFormValues[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleToggleMediaSensitivity(url: string, isSensitive: boolean) {
    try {
      const data = await apiRequest<{ family: FamilyDetail }>(
        `/admin/families/${familyId}/media`,
        {
          method: "PATCH",
          body: JSON.stringify({ items: [{ url, isSensitive }] }),
        },
        getToken(),
      );
      setFamily(data.family);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("families.updateFailed"));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!family || !form) return;

    const countError = validateFamilyCounts(form);
    if (countError) {
      setError(t(`families.validation.${countError}`));
      return;
    }

    setError(null);
    setSaving(true);

    const payload = buildFamilyPayloadFromValues(form, passwords, {
      includePasswords: false,
    });
    const payloadError = validateFamilyPayload(payload, { forUpdate: true });
    if (payloadError) {
      setError(payloadError);
      setSaving(false);
      return;
    }

    try {
      const data = await apiRequest<{ family: FamilyDetail }>(
        `/admin/families/${familyId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        getToken(),
      );
      setFamily(data.family);
      setForm(familyDetailToFormValues(data.family));
      setPasswords(emptyPasswords);
      router.push("/dashboard/admin/families");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("families.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>{t("families.loadingOne")}</p>;
  }

  if (!family || !form) {
    return (
      <>
        <p style={{ color: "var(--error-text)" }}>{error ?? t("families.notFound")}</p>
        <Link href="/dashboard/admin/families">{t("families.backToFamilies")}</Link>
      </>
    );
  }

  return (
    <>
      <div className={styles["page-top"]}>
        <Link href="/dashboard/admin/families" className={styles["btn-back"]}>
          {t("families.backLink")}
        </Link>
      </div>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/admin">{t("common.admin")}</Link> /{" "}
        <Link href="/dashboard/admin/families">{t("families.title")}</Link> /{" "}
        {family.publicCode}
      </div>
      <div className={styles["page-header"]}>
        <h1>{localizedFamilyName(locale, family) ?? family.headOfFamilyName}</h1>
        {family.accountRestricted && (
          <span className={styles["restricted-badge"]}>
            {t("families.accountRestricted")}
          </span>
        )}
      </div>

      <div style={{ maxWidth: "900px", marginBottom: "1.5rem" }}>
        <FamilyFundingProgress family={family} />
      </div>

      <div className={styles.card} style={{ maxWidth: "900px" }}>
        {error && <div className={authStyles["error-banner"]}>{error}</div>}

        <form
          onSubmit={(e) => void handleSubmit(e)}
          dir={isArabicLocale ? "rtl" : "ltr"}
        >
          <section className={styles["form-section"]}>
            <h2>{t("families.form.privateData")}</h2>
            <p className={styles["form-hint"]}>{t("families.form.privateDataHint")}</p>
            <div className={styles["form-grid"]}>
              <BilingualField
                lang={locale}
                icon="users"
                baseId="headOfFamilyName"
                label={t("families.form.fullFamilyName")}
                required
                enValue={form.headOfFamilyName}
                arValue={form.headOfFamilyNameAr}
                onEnChange={(v) => setField("headOfFamilyName", v)}
                onArChange={(v) => setField("headOfFamilyNameAr", v)}
                enPlaceholder={t("families.form.placeholders.fullFamilyName")}
                arPlaceholder={t("families.form.placeholders.fullFamilyNameAr")}
              />
              <div className={styles["form-field"]}>
                <label htmlFor="internalPhone">{t("families.form.internalPhone")}</label>
                <IconInput
                  icon="phone"
                  variant="dashboard"
                  id="internalPhone"
                  type="text"
                  value={form.internalPhone}
                  onChange={(e) => setField("internalPhone", e.target.value)}
                />
              </div>
              {isArabicLocale ? (
                <ReadOnlyFormField
                  label={t("families.form.privateEmail")}
                  value={form.accountEmail}
                  hint={t("families.form.englishOnlyFieldsNote")}
                />
              ) : (
                <div className={styles["form-field"]}>
                  <label htmlFor="accountEmail">{t("families.form.privateEmail")}</label>
                  <IconInput
                    icon="email"
                    variant="dashboard"
                    id="accountEmail"
                    type="email"
                    required
                    autoComplete="off"
                    value={form.accountEmail}
                    onChange={(e) => setField("accountEmail", e.target.value)}
                  />
                </div>
              )}
              <div className={styles["form-field"]}>
                <label htmlFor="nationalId">{t("families.form.nationalId")}</label>
                <IconInput
                  icon="id"
                  variant="dashboard"
                  id="nationalId"
                  type="text"
                  value={form.nationalId}
                  onChange={(e) => setField("nationalId", e.target.value)}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="dataSource">{t("families.form.dataSource")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="dataSource"
                  value={form.dataSource}
                  onChange={(e) => setField("dataSource", e.target.value)}
                >
                  <DataSourceOptions locale={locale} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="assignedCaseOfficer">
                  {t("families.form.assignedCaseOfficer")}
                </label>
                <IconInput
                  icon="user"
                  variant="dashboard"
                  id="assignedCaseOfficer"
                  type="text"
                  value={form.assignedCaseOfficer}
                  onChange={(e) => setField("assignedCaseOfficer", e.target.value)}
                />
              </div>
              <BilingualField
                lang={locale}
                icon="pin"
                baseId="detailedAddress"
                label={t("families.form.detailedAddress")}
                multiline
                full
                enValue={form.detailedAddress}
                arValue={form.detailedAddressAr}
                onEnChange={(v) => setField("detailedAddress", v)}
                onArChange={(v) => setField("detailedAddressAr", v)}
                enPlaceholder={t("families.form.placeholders.detailedAddress")}
                arPlaceholder={t("families.form.placeholders.detailedAddressAr")}
              />
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label htmlFor="externalLinks">{t("families.form.externalLinks")}</label>
                <IconTextarea
                  icon="link"
                  variant="dashboard"
                  id="externalLinks"
                  value={form.externalLinks}
                  onChange={(e) => setField("externalLinks", e.target.value)}
                />
              </div>
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label htmlFor="internalNotes">{t("families.form.internalNotes")}</label>
                <IconTextarea
                  icon="text"
                  variant="dashboard"
                  id="internalNotes"
                  value={form.internalNotes}
                  onChange={(e) => setField("internalNotes", e.target.value)}
                />
              </div>
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label htmlFor="verificationNotes">
                  {t("families.form.verificationNotes")}
                </label>
                <IconTextarea
                  icon="text"
                  variant="dashboard"
                  id="verificationNotes"
                  value={form.verificationNotes}
                  onChange={(e) => setField("verificationNotes", e.target.value)}
                />
              </div>
              {isArabicLocale ? (
                <ReadOnlyFormField
                  full
                  label={t("families.form.newPassword")}
                  value={t("families.form.passwordEnglishOnlyView")}
                />
              ) : (
                <>
                  <PasswordInput
                    id="accountPassword"
                    name="accountPassword"
                    label={t("families.form.newPassword")}
                    minLength={8}
                    autoComplete="new-password"
                    variant="dashboard"
                    value={passwords.accountPassword}
                    onChange={(value) =>
                      setPasswords((p) => ({ ...p, accountPassword: value }))
                    }
                  />
                  <PasswordInput
                    id="confirmAccountPassword"
                    name="confirmAccountPassword"
                    label={t("families.form.confirmNewPassword")}
                    minLength={8}
                    autoComplete="new-password"
                    variant="dashboard"
                    value={passwords.confirmAccountPassword}
                    onChange={(value) =>
                      setPasswords((p) => ({ ...p, confirmAccountPassword: value }))
                    }
                  />
                </>
              )}
            </div>
          </section>

          <section className={styles["form-section"]}>
            <h2>{t("families.form.publicProfile")}</h2>
            <p className={styles["form-hint"]}>
              {t("families.form.publicCode")}: {family.publicCode}
            </p>
            <div className={styles["form-grid"]}>
              <div className={styles["form-field"]}>
                <label htmlFor="governorate">{t("families.form.region")}</label>
                <IconSelect
                  icon="home"
                  variant="dashboard"
                  id="governorate"
                  required
                  value={form.governorate}
                  onChange={(e) => setField("governorate", e.target.value)}
                >
                  <GovernorateOptions locale={locale} />
                </IconSelect>
              </div>
              <BilingualField
                lang={locale}
                icon="pin"
                baseId="areaGeneral"
                label={t("families.form.area")}
                enValue={form.areaGeneral}
                arValue={form.areaGeneralAr}
                onEnChange={(v) => setField("areaGeneral", v)}
                onArChange={(v) => setField("areaGeneralAr", v)}
              />
              <div className={styles["form-field"]}>
                <label htmlFor="familySize">{t("families.form.familySize")}</label>
                <IconInput
                  icon="hash"
                  variant="dashboard"
                  id="familySize"
                  type="number"
                  min={1}
                  required
                  value={form.familySize}
                  onChange={(e) => setField("familySize", e.target.value)}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="childrenCount">{t("families.form.childrenCount")}</label>
                <IconInput
                  icon="hash"
                  variant="dashboard"
                  id="childrenCount"
                  type="number"
                  min={0}
                  value={form.childrenCount}
                  onChange={(e) => setField("childrenCount", e.target.value)}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="infantCount">{t("families.form.infantCount")}</label>
                <IconInput
                  icon="hash"
                  variant="dashboard"
                  id="infantCount"
                  type="number"
                  min={0}
                  value={form.infantCount}
                  onChange={(e) => setField("infantCount", e.target.value)}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="womenCount">{t("families.form.womenCount")}</label>
                <IconInput
                  icon="hash"
                  variant="dashboard"
                  id="womenCount"
                  type="number"
                  min={0}
                  value={form.womenCount}
                  onChange={(e) => setField("womenCount", e.target.value)}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="elderlyCount">{t("families.form.elderlyCount")}</label>
                <IconInput
                  icon="hash"
                  variant="dashboard"
                  id="elderlyCount"
                  type="number"
                  min={0}
                  value={form.elderlyCount}
                  onChange={(e) => setField("elderlyCount", e.target.value)}
                />
              </div>
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <span className={styles["form-hint"]} style={{ display: "block", marginBottom: "0.5rem" }}>
                  {t("families.form.statusFlags")}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 1.5rem" }}>
                  {(
                    [
                      ["hasWidow", "hasWidow"],
                      ["hasOrphans", "hasOrphans"],
                      ["hasDisabledMember", "hasDisabled"],
                      ["hasChronicPatient", "hasChronic"],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <label key={key} className={styles["checkbox-field"]}>
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => setField(key, e.target.checked)}
                      />
                      {t(`families.form.${labelKey}`)}
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="housingStatus">{t("families.form.housingStatus")}</label>
                <IconSelect
                  icon="home"
                  variant="dashboard"
                  id="housingStatus"
                  value={form.housingStatus}
                  onChange={(e) => setField("housingStatus", e.target.value)}
                >
                  <HousingOptions locale={locale} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="incomeStatus">{t("families.form.incomeStatus")}</label>
                <IconSelect
                  icon="money"
                  variant="dashboard"
                  id="incomeStatus"
                  value={form.incomeStatus}
                  onChange={(e) => setField("incomeStatus", e.target.value)}
                >
                  <IncomeOptions locale={locale} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="displacementStatus">
                  {t("families.form.displacementStatus")}
                </label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="displacementStatus"
                  value={form.displacementStatus}
                  onChange={(e) => setField("displacementStatus", e.target.value)}
                >
                  <DisplacementOptions locale={locale} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="caseCategory">{t("families.form.caseCategory")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="caseCategory"
                  required
                  value={form.caseCategory}
                  onChange={(e) => setField("caseCategory", e.target.value)}
                >
                  <CaseCategoryOptions locale={locale} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="priorityLevel">{t("families.form.priority")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="priorityLevel"
                  required
                  value={form.priorityLevel}
                  onChange={(e) => setField("priorityLevel", e.target.value)}
                >
                  <PriorityOptions locale={locale} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="monthlyRequiredAmount">
                  {t("families.form.monthlyRequired")}
                </label>
                <IconInput
                  icon="money"
                  variant="dashboard"
                  id="monthlyRequiredAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={form.monthlyRequiredAmount}
                  onChange={(e) => setField("monthlyRequiredAmount", e.target.value)}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="profileStatus">{t("families.form.profileStatus")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="profileStatus"
                  value={form.profileStatus}
                  onChange={(e) => setField("profileStatus", e.target.value)}
                >
                  <ProfileStatusOptions extended locale={locale} />
                </IconSelect>
              </div>
              <ReadOnlyFormField
                label={t("families.form.coverageStatus")}
                value={te("coverageStatus", family.coverageStatus)}
                hint={t("families.form.coverageStatusHint")}
              />
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label>{t("families.form.receivingMethods")}</label>
                <p className={styles["form-hint"]}>
                  {isArabicLocale
                    ? t("families.form.englishOnlyFieldsNote")
                    : t("families.form.receivingMethodsHint")}
                </p>
                {isArabicLocale ? (
                  <ReceivingMethodsDisplay methods={form.receivingMethods} />
                ) : (
                  <ReceivingMethodsEditor
                    methods={form.receivingMethods}
                    onChange={(methods) => setField("receivingMethods", methods)}
                  />
                )}
              </div>
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label>{t("families.form.media")}</label>
                {isArabicLocale && (
                  <p className={styles["form-hint"]}>
                    {t("families.form.englishOnlyFieldsNote")}
                  </p>
                )}
                <FamilyMediaPreview
                  items={family.mediaItems ?? []}
                  onToggleSensitivity={
                    isArabicLocale ? undefined : handleToggleMediaSensitivity
                  }
                />
              </div>
              <BilingualField
                lang={locale}
                icon="text"
                baseId="publicStory"
                label={t("families.form.publicStory")}
                multiline
                full
                enValue={form.publicStory}
                arValue={form.publicStoryAr}
                onEnChange={(v) => setField("publicStory", v)}
                onArChange={(v) => setField("publicStoryAr", v)}
                enPlaceholder={t("families.form.placeholders.publicStory")}
                arPlaceholder={t("families.form.placeholders.publicStoryAr")}
              />
            </div>
          </section>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="submit" className={styles["btn-save"]} disabled={saving}>
              {saving ? t("common.saving") : t("families.form.saveChanges")}
            </button>
            <Link
              href="/dashboard/admin/families"
              className={styles["btn-primary-inline"]}
              style={{ background: "var(--secondary-muted)" }}
            >
              {t("common.cancel")}
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
