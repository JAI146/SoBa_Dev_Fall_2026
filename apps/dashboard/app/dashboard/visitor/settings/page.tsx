"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { DonorAccountSettings } from "@muakhah/contracts";
import { LocationFields } from "@/components/auth/location-fields";
import { PasswordInput } from "@/components/auth/password-input";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { ProfileImageUpload } from "@/components/account/profile-image-upload";
import { apiRequest } from "@/lib/api-client";
import { getToken, updateStoredUser } from "@/lib/auth";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

type ProfileForm = {
  firstName: string;
  lastName: string;
  country: string;
  city: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function AccountSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<DonorAccountSettings | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    country: "",
    city: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [requestingDelete, setRequestingDelete] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ settings: DonorAccountSettings }>(
        "/donor/account",
        {},
        getToken(),
      );
      setSettings(data.settings);
      setProfileForm({
        firstName: data.settings.firstName,
        lastName: data.settings.lastName,
        country: data.settings.country ?? "",
        city: data.settings.city ?? "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("visitor.settings.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiRequest<{ settings: DonorAccountSettings }>(
        "/donor/account",
        {
          method: "PATCH",
          body: JSON.stringify({
            firstName: profileForm.firstName,
            lastName: profileForm.lastName,
            country: profileForm.country,
            city: profileForm.city || null,
          }),
        },
        getToken(),
      );
      setSettings(data.settings);
      updateStoredUser({
        firstName: data.settings.firstName,
        lastName: data.settings.lastName,
      });
      setSuccess(t("visitor.settings.profileSaved"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("visitor.settings.saveFailed"),
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleProfileImageUpload(file: File) {
    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      const data = await apiRequest<{ settings: DonorAccountSettings }>(
        "/donor/account/profile-image",
        {
          method: "PATCH",
          body: formData,
        },
        getToken(),
      );
      setSettings(data.settings);
      updateStoredUser({ profileImageUrl: data.settings.profileImageUrl });
      setSuccess(t("visitor.settings.photoSaved"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("visitor.settings.photoFailed"),
      );
      throw err;
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(
        "/donor/account/password",
        {
          method: "PATCH",
          body: JSON.stringify(passwordForm),
        },
        getToken(),
      );
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setSuccess(t("visitor.settings.passwordSaved"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("visitor.settings.passwordFailed"),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleNotificationChange(
    key: keyof DonorAccountSettings["notificationPreferences"],
    value: boolean,
  ) {
    if (!settings) return;
    const nextPreferences = {
      ...settings.notificationPreferences,
      [key]: value,
    };
    setSettings({ ...settings, notificationPreferences: nextPreferences });
    setSavingNotifications(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiRequest<{ settings: DonorAccountSettings }>(
        "/donor/account/notifications",
        {
          method: "PATCH",
          body: JSON.stringify(nextPreferences),
        },
        getToken(),
      );
      setSettings(data.settings);
      setSuccess(t("visitor.settings.notificationsSaved"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("visitor.settings.notificationsFailed"),
      );
      void loadSettings();
    } finally {
      setSavingNotifications(false);
    }
  }

  async function confirmDeleteRequest() {
    setRequestingDelete(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiRequest<{ settings: DonorAccountSettings }>(
        "/donor/account/delete-request",
        { method: "POST" },
        getToken(),
      );
      setSettings(data.settings);
      setDeleteModalOpen(false);
      setSuccess(t("visitor.settings.deleteRequested"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("visitor.settings.deleteFailed"),
      );
    } finally {
      setRequestingDelete(false);
    }
  }

  if (loading) {
    return <div className={styles.card}>{t("visitor.settings.loading")}</div>;
  }

  return (
    <>
      <ConfirmModal
        open={deleteModalOpen}
        title={t("visitor.settings.deleteTitle")}
        message={t("visitor.settings.deleteMessage")}
        tone="danger"
        loading={requestingDelete}
        onConfirm={() => void confirmDeleteRequest()}
        onCancel={() => {
          if (!requestingDelete) setDeleteModalOpen(false);
        }}
      />

      <div className={styles["page-header"]}>
        <h1>{t("visitor.settings.title")}</h1>
        <p className={styles["page-description"]}>{t("visitor.settings.description")}</p>
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

      <div className={`${styles.card} ${styles["card-wide"]}`}>
        <form onSubmit={(e) => void handleProfileSubmit(e)}>
          <h2 className={styles["section-title"]}>{t("visitor.settings.profileSection")}</h2>

          <ProfileImageUpload
            currentImageUrl={settings?.profileImageUrl ?? null}
            onUpload={handleProfileImageUpload}
            uploading={uploadingPhoto}
            disabled={savingProfile}
          />

          <div className={styles["form-grid"]}>
            <div className={styles["form-field"]}>
              <label htmlFor="firstName">{t("visitor.settings.firstName")}</label>
              <input
                id="firstName"
                value={profileForm.firstName}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                required
              />
            </div>
            <div className={styles["form-field"]}>
              <label htmlFor="lastName">{t("visitor.settings.lastName")}</label>
              <input
                id="lastName"
                value={profileForm.lastName}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                required
              />
            </div>
            <div className={`${styles["form-field"]} ${styles.full}`}>
              <label htmlFor="email">{t("visitor.settings.email")}</label>
              <input
                id="email"
                value={settings?.email ?? ""}
                readOnly
                disabled
              />
              <p className={styles["form-hint"]}>{t("visitor.settings.emailHint")}</p>
            </div>
          </div>

          <LocationFields
            country={profileForm.country}
            state=""
            city={profileForm.city}
            onCountryChange={(value) =>
              setProfileForm((prev) => ({ ...prev, country: value, city: "" }))
            }
            onStateChange={() => {}}
            onCityChange={(value) =>
              setProfileForm((prev) => ({ ...prev, city: value }))
            }
          />

          <div className={styles["form-actions"]}>
            <button
              type="submit"
              className={styles["btn-primary-inline"]}
              disabled={savingProfile}
            >
              {savingProfile ? t("common.saving") : t("visitor.settings.saveProfile")}
            </button>
          </div>
        </form>
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`} style={{ marginTop: "1rem" }}>
        <form onSubmit={(e) => void handlePasswordSubmit(e)}>
          <h2 className={styles["section-title"]}>{t("visitor.settings.passwordSection")}</h2>
          <div className={styles["form-grid"]}>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              label={t("visitor.settings.currentPassword")}
              value={passwordForm.currentPassword}
              onChange={(value) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: value }))
              }
              autoComplete="current-password"
              variant="dashboard"
              required
            />
            <PasswordInput
              id="newPassword"
              name="newPassword"
              label={t("visitor.settings.newPassword")}
              value={passwordForm.newPassword}
              onChange={(value) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: value }))
              }
              autoComplete="new-password"
              minLength={8}
              variant="dashboard"
              required
            />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label={t("visitor.settings.confirmPassword")}
              value={passwordForm.confirmPassword}
              onChange={(value) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))
              }
              autoComplete="new-password"
              minLength={8}
              variant="dashboard"
              required
            />
          </div>
          <div className={styles["form-actions"]}>
            <button
              type="submit"
              className={styles["btn-primary-inline"]}
              disabled={savingPassword}
            >
              {savingPassword ? t("common.saving") : t("visitor.settings.updatePassword")}
            </button>
          </div>
        </form>
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`} style={{ marginTop: "1rem" }}>
        <h2 className={styles["section-title"]}>
          {t("visitor.settings.notificationsSection")}
        </h2>
        <div className={styles["checkbox-list"]}>
          {(
            [
              ["sponsorshipUpdates", "visitor.settings.notifySponsorshipUpdates"],
              ["messageAlerts", "visitor.settings.notifyMessageAlerts"],
              ["adminNotices", "visitor.settings.notifyAdminNotices"],
            ] as const
          ).map(([key, labelKey]) => (
            <label key={key} className={styles["checkbox-row"]}>
              <input
                type="checkbox"
                checked={settings?.notificationPreferences[key] ?? false}
                disabled={savingNotifications || !settings}
                onChange={(e) => void handleNotificationChange(key, e.target.checked)}
              />
              <span>{t(labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={`${styles.card} ${styles["card-wide"]}`} style={{ marginTop: "1rem" }}>
        <h2 className={styles["section-title"]}>{t("visitor.settings.deleteSection")}</h2>
        <p className={styles["form-hint"]}>{t("visitor.settings.deleteHint")}</p>
        {settings?.deleteAccountRequested ? (
          <p className={styles["form-hint"]}>{t("visitor.settings.deletePending")}</p>
        ) : (
          <button
            type="button"
            className={styles["btn-secondary-inline"]}
            onClick={() => setDeleteModalOpen(true)}
          >
            {t("visitor.settings.requestDelete")}
          </button>
        )}
      </div>
    </>
  );
}
