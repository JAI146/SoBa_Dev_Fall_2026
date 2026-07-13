"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { FamilyListItem } from "@muakhah/contracts";
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
import {
  MediaUploadField,
  type MediaUploadItem,
} from "@/components/admin/media-upload-field";
import { ReadOnlyFormField } from "@/components/admin/read-only-form-field";
import { ReceivingMethodsDisplay } from "@/components/admin/receiving-methods-display";
import { ReceivingMethodsEditor } from "@/components/admin/receiving-methods-editor";
import { PasswordInput } from "@/components/auth/password-input";
import { IconInput, IconSelect, IconTextarea } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import {
  buildFamilyPayloadFromValues,
  defaultFamilyFormValues,
  validateFamilyCounts,
  validateFamilyPayload,
  type FamilyFormValues,
} from "@/lib/family-form";
import { getToken } from "@/lib/auth";
import styles from "../../../dashboard.module.css";
import authStyles from "../../../../auth.module.css";

const initialPasswords = {
  accountPassword: "",
  confirmAccountPassword: "",
};

export default function AddFamilyPage() {
  const { t, te, locale, setLocale } = useI18n();
  const router = useRouter();
  const formTopRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<FamilyFormValues>({
    ...defaultFamilyFormValues,
    governorate: "",
    caseCategory: "",
    priorityLevel: "",
    familySize: "",
    childrenCount: "",
    infantCount: "",
    womenCount: "",
    elderlyCount: "",
    monthlyRequiredAmount: "",
  });
  const [passwords, setPasswords] = useState(initialPasswords);
  const [mediaItems, setMediaItems] = useState<MediaUploadItem[]>([]);
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const familyCreated = createdFamilyId !== null;
  /** After create, force Arabic form language for bilingual fields. */
  const formLang = familyCreated ? "ar" : "en";
  const isArabicStep = familyCreated || locale === "ar";
  const arabicBlocked = locale === "ar" && !familyCreated;
  /** Lock non-bilingual fields once the English record exists. */
  const structuralLocked = arabicBlocked || familyCreated;

  useEffect(() => {
    if (!familyCreated) return;
    if (locale !== "ar") setLocale("ar");
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [familyCreated, locale, setLocale]);

  function setField<K extends keyof FamilyFormValues>(
    key: K,
    value: FamilyFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const countError = validateFamilyCounts(values);
    if (countError) {
      setError(t(`families.validation.${countError}`));
      return;
    }

    if (familyCreated) {
      await handleAddArabic();
      return;
    }

    setLoading(true);
    const payload = buildFamilyPayloadFromValues(values, passwords);
    const payloadError = validateFamilyPayload(payload);
    if (payloadError) {
      setError(payloadError);
      setLoading(false);
      return;
    }

    payload.mediaSensitivity = mediaItems.map((item) => item.isSensitive);

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    for (const item of mediaItems) {
      formData.append("media", item.file);
    }

    try {
      const data = await apiRequest<{ family: FamilyListItem }>(
        "/admin/families",
        { method: "POST", body: formData },
        getToken(),
      );
      setCreatedFamilyId(data.family.id);
      setLocale("ar");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("families.createFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddArabic() {
    if (!createdFamilyId) return;
    setError(null);
    setLoading(true);
    const payload = buildFamilyPayloadFromValues(values, passwords, {
      includePasswords: false,
    });
    const payloadError = validateFamilyPayload(payload, { forUpdate: true });
    if (payloadError) {
      setError(payloadError);
      setLoading(false);
      return;
    }

    try {
      await apiRequest<{ family: FamilyListItem }>(
        `/admin/families/${createdFamilyId}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        getToken(),
      );
      router.push("/dashboard/admin/families");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("families.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/admin">{t("common.admin")}</Link> /{" "}
        <Link href="/dashboard/admin/families">{t("families.title")}</Link> /{" "}
        {t("families.addBreadcrumb")}
      </div>
      <div className={styles["page-header"]}>
        <h1>{t("families.addFamily")}</h1>
      </div>

      <div ref={formTopRef} className={`${styles.card} ${styles["card-wide"]}`}>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          dir={formLang === "ar" ? "rtl" : "ltr"}
        >
          {arabicBlocked && (
            <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
              {t("families.form.arabicDisabledHint")}
            </div>
          )}
          {familyCreated && (
            <div
              className={authStyles["success-banner"]}
              style={{ marginBottom: "1rem" }}
            >
              {t("families.form.arabicPending")}
            </div>
          )}
          <section className={styles["form-section"]}>
            <h2>{t("families.form.privateData")}</h2>
            <p className={styles["form-hint"]}>{t("families.form.privateDataHint")}</p>
            <div className={`${styles["form-grid"]} ${styles["form-grid-3"]}`}>
              <BilingualField
                lang={formLang}
                icon="users"
                baseId="headOfFamilyName"
                label={t("families.form.fullFamilyName")}
                required
                enValue={values.headOfFamilyName}
                arValue={values.headOfFamilyNameAr}
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
                  value={values.internalPhone}
                  onChange={(e) => setField("internalPhone", e.target.value)}
                  disabled={structuralLocked}
                />
              </div>
              {isArabicStep ? (
                <ReadOnlyFormField
                  label={t("families.form.privateEmail")}
                  value={values.accountEmail}
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
                    value={values.accountEmail}
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
                  value={values.nationalId}
                  onChange={(e) => setField("nationalId", e.target.value)}
                  disabled={structuralLocked}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="dataSource">{t("families.form.dataSource")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="dataSource"
                  value={values.dataSource}
                  onChange={(e) => setField("dataSource", e.target.value)}
                  disabled={structuralLocked}
                >
                  <DataSourceOptions locale={formLang} />
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
                  value={values.assignedCaseOfficer}
                  onChange={(e) => setField("assignedCaseOfficer", e.target.value)}
                  disabled={structuralLocked}
                />
              </div>
              <div className={styles["form-row-2"]}>
                <BilingualField
                  lang={formLang}
                  icon="pin"
                  baseId="detailedAddress"
                  label={t("families.form.detailedAddress")}
                  multiline
                  enValue={values.detailedAddress}
                  arValue={values.detailedAddressAr}
                  onEnChange={(v) => setField("detailedAddress", v)}
                  onArChange={(v) => setField("detailedAddressAr", v)}
                  enPlaceholder={t("families.form.placeholders.detailedAddress")}
                  arPlaceholder={t("families.form.placeholders.detailedAddressAr")}
                />
                <div className={styles["form-field"]}>
                  <label htmlFor="externalLinks">{t("families.form.externalLinks")}</label>
                  <IconTextarea
                    icon="link"
                    variant="dashboard"
                    id="externalLinks"
                    value={values.externalLinks}
                    onChange={(e) => setField("externalLinks", e.target.value)}
                    disabled={structuralLocked}
                  />
                </div>
              </div>
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label htmlFor="internalNotes">{t("families.form.internalNotes")}</label>
                <IconTextarea
                  icon="text"
                  variant="dashboard"
                  id="internalNotes"
                  value={values.internalNotes}
                  onChange={(e) => setField("internalNotes", e.target.value)}
                  disabled={structuralLocked}
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
                  value={values.verificationNotes}
                  onChange={(e) => setField("verificationNotes", e.target.value)}
                  disabled={structuralLocked}
                />
              </div>
              {isArabicStep ? (
                <ReadOnlyFormField
                  full
                  label={t("families.form.loginPassword")}
                  value={t("families.form.passwordEnglishOnlyView")}
                />
              ) : (
                <>
                  <PasswordInput
                    id="accountPassword"
                    name="accountPassword"
                    label={t("families.form.loginPassword")}
                    required
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
                    label={t("families.form.confirmPassword")}
                    required
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
            <p className={styles["form-hint"]}>{t("families.form.publicCodeHint")}</p>
            <div className={`${styles["form-grid"]} ${styles["form-grid-3"]}`}>
              <div className={styles["form-field"]}>
                <label htmlFor="governorate">{t("families.form.region")}</label>
                <IconSelect
                  icon="home"
                  variant="dashboard"
                  id="governorate"
                  required
                  value={values.governorate}
                  onChange={(e) => setField("governorate", e.target.value)}
                  disabled={structuralLocked}
                >
                  <GovernorateOptions locale={formLang} />
                </IconSelect>
              </div>
              <BilingualField
                lang={formLang}
                icon="pin"
                baseId="areaGeneral"
                label={t("families.form.area")}
                enValue={values.areaGeneral}
                arValue={values.areaGeneralAr}
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
                  value={values.familySize}
                  onChange={(e) => setField("familySize", e.target.value)}
                  disabled={structuralLocked}
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
                  value={values.childrenCount}
                  onChange={(e) => setField("childrenCount", e.target.value)}
                  disabled={structuralLocked}
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
                  value={values.infantCount}
                  onChange={(e) => setField("infantCount", e.target.value)}
                  disabled={structuralLocked}
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
                  value={values.womenCount}
                  onChange={(e) => setField("womenCount", e.target.value)}
                  disabled={structuralLocked}
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
                  value={values.elderlyCount}
                  onChange={(e) => setField("elderlyCount", e.target.value)}
                  disabled={structuralLocked}
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
                        checked={values[key]}
                        onChange={(e) => setField(key, e.target.checked)}
                        disabled={structuralLocked}
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
                  value={values.housingStatus}
                  onChange={(e) => setField("housingStatus", e.target.value)}
                  disabled={structuralLocked}
                >
                  <HousingOptions locale={formLang} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="incomeStatus">{t("families.form.incomeStatus")}</label>
                <IconSelect
                  icon="money"
                  variant="dashboard"
                  id="incomeStatus"
                  value={values.incomeStatus}
                  onChange={(e) => setField("incomeStatus", e.target.value)}
                  disabled={structuralLocked}
                >
                  <IncomeOptions locale={formLang} />
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
                  value={values.displacementStatus}
                  onChange={(e) => setField("displacementStatus", e.target.value)}
                  disabled={structuralLocked}
                >
                  <DisplacementOptions locale={formLang} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="caseCategory">{t("families.form.caseCategory")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="caseCategory"
                  required
                  value={values.caseCategory}
                  onChange={(e) => setField("caseCategory", e.target.value)}
                  disabled={structuralLocked}
                >
                  <CaseCategoryOptions locale={formLang} />
                </IconSelect>
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="priorityLevel">{t("families.form.priority")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="priorityLevel"
                  required
                  value={values.priorityLevel}
                  onChange={(e) => setField("priorityLevel", e.target.value)}
                  disabled={structuralLocked}
                >
                  <PriorityOptions locale={formLang} />
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
                  value={values.monthlyRequiredAmount}
                  onChange={(e) => setField("monthlyRequiredAmount", e.target.value)}
                  disabled={structuralLocked}
                />
              </div>
              <div className={styles["form-field"]}>
                <label htmlFor="profileStatus">{t("families.form.profileStatus")}</label>
                <IconSelect
                  icon="list"
                  variant="dashboard"
                  id="profileStatus"
                  value={values.profileStatus}
                  onChange={(e) => setField("profileStatus", e.target.value)}
                  disabled={structuralLocked}
                >
                  <ProfileStatusOptions locale={formLang} />
                </IconSelect>
              </div>
              <ReadOnlyFormField
                label={t("families.form.coverageStatus")}
                value={te("coverageStatus", "not_covered")}
                hint={t("families.form.coverageStatusHint")}
              />
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label>{t("families.form.receivingMethods")}</label>
                <p className={styles["form-hint"]}>
                  {isArabicStep
                    ? t("families.form.englishOnlyFieldsNote")
                    : t("families.form.receivingMethodsHint")}
                </p>
                {isArabicStep ? (
                  <ReceivingMethodsDisplay methods={values.receivingMethods} />
                ) : (
                  <ReceivingMethodsEditor
                    methods={values.receivingMethods}
                    onChange={(methods) => setField("receivingMethods", methods)}
                  />
                )}
              </div>
              <div className={`${styles["form-field"]} ${styles.full}`}>
                <label>{t("families.form.media")}</label>
                {isArabicStep ? (
                  <>
                    <p className={styles["form-hint"]}>
                      {t("families.form.englishOnlyFieldsNote")}
                    </p>
                    {mediaItems.length === 0 ? (
                      <p className={styles["form-hint"]} style={{ margin: 0 }}>
                        {t("visitor.families.noMedia")}
                      </p>
                    ) : (
                      <p className={styles["form-readonly-value"]}>
                        {t("families.form.mediaSelected", {
                          count: String(mediaItems.length),
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <MediaUploadField items={mediaItems} onChange={setMediaItems} />
                )}
              </div>
              <BilingualField
                lang={formLang}
                icon="text"
                baseId="publicStory"
                label={t("families.form.publicStory")}
                multiline
                full
                enValue={values.publicStory}
                arValue={values.publicStoryAr}
                onEnChange={(v) => setField("publicStory", v)}
                onArChange={(v) => setField("publicStoryAr", v)}
                enPlaceholder={t("families.form.placeholders.publicStory")}
                arPlaceholder={t("families.form.placeholders.publicStoryAr")}
              />
            </div>
          </section>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="submit"
              className={styles["btn-save"]}
              disabled={loading || arabicBlocked}
            >
              {loading
                ? t("common.saving")
                : familyCreated
                  ? t("families.form.saveArabic")
                  : t("families.form.createFamily")}
            </button>
            {familyCreated && (
              <Link
                href="/dashboard/admin/families"
                className={styles["btn-primary-inline"]}
                style={{ background: "var(--secondary-muted)" }}
              >
                {t("families.form.skipArabic")}
              </Link>
            )}
          </div>

          {error && (
            <div className={authStyles["error-banner"]} style={{ marginTop: "1rem" }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </>
  );
}
