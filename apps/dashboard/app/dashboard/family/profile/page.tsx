"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type {
  FamilySelfProfile,
  FamilySelfUpdatableFieldKey,
  ProfileUpdateRequestListItem,
} from "@muakhah/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import {
  localizedDetailedAddress,
  localizedFamilyName,
  localizedPublicStory,
  localizedAreaGeneral,
} from "@/lib/localized-text";
import {
  FAMILY_UPDATABLE_FIELDS,
  getUpdatableFieldMeta,
  parseStoredProfileValue,
} from "@/lib/family-updatable-fields";
import { FamilyProfileFieldLabel } from "@/components/family/family-profile-field-label";
import { sponsorshipStatusClass } from "@/lib/sponsorship-status";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

const ENUM_OPTIONS: Record<string, readonly string[]> = {
  governorate: ["north_gaza", "gaza", "middle_area", "khan_younis", "rafah", "unknown"],
  caseCategory: [
    "martyr_family", "widow", "orphans", "modest_family", "no_breadwinner",
    "displaced", "medical", "disability", "general",
  ],
  housingStatus: ["tent", "shelter", "damaged_home", "hosted", "rented", "unknown"],
  incomeStatus: ["none", "limited", "unstable", "unknown"],
  displacementStatus: ["displaced", "not_displaced", "returned", "unknown"],
};

function displayValue(
  profile: FamilySelfProfile,
  key: FamilySelfUpdatableFieldKey,
  te: (group: string, value: string) => string,
  t: (key: string) => string,
  locale: "en" | "ar",
) {
  const meta = getUpdatableFieldMeta(key);
  if (meta?.type === "boolean") {
    const value = profile[key as keyof FamilySelfProfile];
    return value ? t("common.yes") : t("common.no");
  }
  if (meta?.type === "enum" && typeof profile[key as keyof FamilySelfProfile] === "string") {
    return te(meta.enumGroup ?? key, profile[key as keyof FamilySelfProfile] as string);
  }

  if (key === "headOfFamilyName") {
    return localizedFamilyName(locale, profile) ?? t("common.empty");
  }
  if (key === "detailedAddress") {
    return localizedDetailedAddress(locale, profile) ?? t("common.empty");
  }
  if (key === "areaGeneral") {
    return localizedAreaGeneral(locale, profile) ?? t("common.empty");
  }
  if (key === "publicStory") {
    return localizedPublicStory(locale, profile) ?? t("common.empty");
  }

  const value = profile[key as keyof FamilySelfProfile];
  if (value === null || value === undefined || value === "") {
    return t("common.empty");
  }
  return String(value);
}

function profileFieldFormValue(
  profile: FamilySelfProfile,
  fieldKey: FamilySelfUpdatableFieldKey,
  meta: ReturnType<typeof getUpdatableFieldMeta>,
): string {
  if (!meta) return "";
  const current = profile[fieldKey as keyof FamilySelfProfile];
  if (meta.type === "boolean") {
    return current === true ? "true" : "false";
  }
  if (current === null || current === undefined) {
    return "";
  }
  return String(current);
}

function profileValuesEqual(
  profile: FamilySelfProfile,
  fieldKey: FamilySelfUpdatableFieldKey,
  meta: ReturnType<typeof getUpdatableFieldMeta>,
  newValue: string,
): boolean {
  if (!meta) return true;
  const currentFormValue = profileFieldFormValue(profile, fieldKey, meta);
  if (meta.type === "number") {
    if (newValue === "" && currentFormValue === "") return true;
    return Number(newValue) === Number(currentFormValue);
  }
  return newValue.trim() === currentFormValue.trim();
}

export default function FamilyProfilePage() {
  const { t, te, locale } = useI18n();
  const [profile, setProfile] = useState<FamilySelfProfile | null>(null);
  const [requests, setRequests] = useState<ProfileUpdateRequestListItem[]>([]);
  const [fieldKey, setFieldKey] = useState<FamilySelfUpdatableFieldKey>("publicStory");
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fieldMeta = useMemo(() => getUpdatableFieldMeta(fieldKey), [fieldKey]);

  const valueChanged = useMemo(() => {
    if (!profile || !fieldMeta) return false;
    return !profileValuesEqual(profile, fieldKey, fieldMeta, newValue);
  }, [profile, fieldKey, fieldMeta, newValue]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, requestsData] = await Promise.all([
        apiRequest<{ profile: FamilySelfProfile }>("/family/profile", {}, getToken()),
        apiRequest<{ requests: ProfileUpdateRequestListItem[] }>(
          "/family/profile/update-requests",
          {},
          getToken(),
        ),
      ]);
      setProfile(profileData.profile);
      setRequests(requestsData.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("family.profile.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!profile || !fieldMeta) return;
    const current = profile[fieldKey as keyof FamilySelfProfile];
    if (fieldMeta.type === "boolean") {
      setNewValue(current === true ? "true" : "false");
    } else {
      setNewValue(current === null || current === undefined ? "" : String(current));
    }
  }, [fieldKey, profile, fieldMeta]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldMeta || !profile || !valueChanged) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let requestedValue: string | number | boolean = newValue;
    if (fieldMeta.type === "number") {
      requestedValue = Number(newValue);
    } else if (fieldMeta.type === "boolean") {
      requestedValue = newValue === "true";
    }

    try {
      const data = await apiRequest<{ request: ProfileUpdateRequestListItem }>(
        "/family/profile/update-requests",
        {
          method: "POST",
          body: JSON.stringify({ fieldKey, requestedValue }),
        },
        getToken(),
      );
      setRequests((prev) => [data.request, ...prev]);
      setSuccess(t("family.profile.requestSubmitted"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("family.profile.requestFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className={styles.card}>{t("family.profile.loading")}</div>;
  }

  if (!profile) {
    return (
      <div className={styles.card}>
        {error && <div className={authStyles["error-banner"]}>{error}</div>}
      </div>
    );
  }

  return (
    <>
      <div className={styles["page-header"]}>
        <h1>{t("family.profile.title")}</h1>
        <p>{t("family.profile.description")}</p>
      </div>

      {error && (
        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div className={authStyles["success-banner"]} style={{ marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      <div className={`${styles.card} ${styles["card-wide"]}`} style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("family.profile.currentDetails")}</h2>
        <dl className={styles["family-detail-list"]}>
          {FAMILY_UPDATABLE_FIELDS.map((field) => (
            <div
              key={field.key}
              className={
                field.type === "textarea"
                  ? `${styles["family-detail-row"]} ${styles["family-detail-row--multiline"]}`
                  : styles["family-detail-row"]
              }
            >
              <dt>
                <FamilyProfileFieldLabel icon={field.icon}>
                  {t(field.labelKey)}
                </FamilyProfileFieldLabel>
              </dt>
              <dd>{displayValue(profile, field.key, te, t, locale)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`} style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("family.profile.requestTitle")}</h2>
        <p className={styles["form-hint"]}>{t("family.profile.requestHint")}</p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className={styles["form-grid"]}>
            <div className={styles["form-field"]}>
              <label htmlFor="update-field">{t("family.profile.fieldLabel")}</label>
              <select
                id="update-field"
                value={fieldKey}
                onChange={(e) =>
                  setFieldKey(e.target.value as FamilySelfUpdatableFieldKey)
                }
              >
                {FAMILY_UPDATABLE_FIELDS.map((field) => (
                  <option key={field.key} value={field.key}>
                    {t(field.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles["form-field"]}>
              <label htmlFor="update-value">{t("family.profile.newValueLabel")}</label>
              {fieldMeta?.type === "textarea" ? (
                <textarea
                  id="update-value"
                  rows={4}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                />
              ) : fieldMeta?.type === "enum" ? (
                <select
                  id="update-value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                >
                  {(ENUM_OPTIONS[fieldMeta.enumGroup ?? ""] ?? []).map((value) => (
                    <option key={value} value={value}>
                      {te(fieldMeta.enumGroup ?? fieldKey, value)}
                    </option>
                  ))}
                </select>
              ) : fieldMeta?.type === "boolean" ? (
                <select
                  id="update-value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                >
                  <option value="true">{t("common.yes")}</option>
                  <option value="false">{t("common.no")}</option>
                </select>
              ) : fieldMeta?.type === "number" ? (
                <input
                  id="update-value"
                  type="number"
                  min="0"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                />
              ) : (
                <input
                  id="update-value"
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                />
              )}
            </div>
          </div>
          <div className={styles["form-footer"]}>
            <button
              type="submit"
              className={styles["btn-primary-inline"]}
              disabled={submitting || !valueChanged}
            >
              {submitting ? t("family.profile.submitting") : t("family.profile.submitRequest")}
            </button>
          </div>
        </form>
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <h2 style={{ marginTop: 0 }}>{t("family.profile.myRequests")}</h2>
        {requests.length === 0 ? (
          <p className={styles["empty-state"]}>{t("family.profile.noRequests")}</p>
        ) : (
          <div className={styles["table-scroll"]}>
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>{t("family.profile.table.field")}</th>
                  <th>{t("family.profile.table.current")}</th>
                  <th>{t("family.profile.table.requested")}</th>
                  <th>{t("family.profile.table.status")}</th>
                  <th>{t("family.profile.table.adminNotes")}</th>
                  <th>{t("family.profile.table.submitted")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => {
                  const meta = getUpdatableFieldMeta(item.fieldKey);
                  const current = parseStoredProfileValue(item.currentValue);
                  const requested = parseStoredProfileValue(item.requestedValue);
                  const format = (val: unknown) => {
                    if (meta?.type === "boolean") {
                      return val === true ? t("common.yes") : t("common.no");
                    }
                    if (meta?.type === "enum" && typeof val === "string") {
                      return te(meta.enumGroup ?? item.fieldKey, val);
                    }
                    return val === null || val === undefined ? t("common.empty") : String(val);
                  };
                  return (
                    <tr key={item.id}>
                      <td>{meta ? t(meta.labelKey) : item.fieldKey}</td>
                      <td>{format(current)}</td>
                      <td>{format(requested)}</td>
                      <td>
                        <span
                          className={`${styles["status-badge"]} ${sponsorshipStatusClass(item.status === "pending" ? "pending" : item.status === "approved" ? "approved" : "rejected")}`}
                        >
                          {te("profileUpdateStatus", item.status)}
                        </span>
                      </td>
                      <td>
                        {item.status === "rejected" && item.adminNotes ? (
                          <p className={styles["profile-rejection-note"]}>
                            {item.adminNotes}
                          </p>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
