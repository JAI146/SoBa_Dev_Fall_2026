"use client";

import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SmtpConfigPublic } from "@muakhah/contracts";
import { IconInput } from "@/components/forms/icon-field";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "../../../../dashboard.module.css";
import authStyles from "../../../../../auth.module.css";

export default function SmtpConfigPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    smtpServer: "",
    smtpPort: "465",
    smtpEmailUser: "",
    smtpEmailPassword: "",
    smtpBcc: "",
    smtpEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = getToken();
        const data = await apiRequest<{ config: SmtpConfigPublic | null }>(
          "/admin/settings/smtp",
          {},
          token,
        );
        if (data.config) {
          setForm({
            smtpServer: data.config.smtpServer,
            smtpPort: String(data.config.smtpPort),
            smtpEmailUser: data.config.smtpEmailUser,
            smtpEmailPassword: data.config.smtpEmailPassword,
            smtpBcc: data.config.smtpBcc ?? "",
            smtpEnabled: data.config.smtpEnabled,
          });
          setUpdatedAt(data.config.updatedAt);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("admin.settings.loadFailed"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const token = getToken();
      const data = await apiRequest<{ config: SmtpConfigPublic }>(
        "/admin/settings/smtp",
        {
          method: "PUT",
          body: JSON.stringify({
            ...form,
            smtpPort: Number(form.smtpPort),
          }),
        },
        token,
      );
      setUpdatedAt(data.config.updatedAt);
      setSuccess(t("admin.settings.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.card}>{t("admin.settings.smtpLoading")}</div>;
  }

  return (
    <div className={styles.card}>
      <h2 style={{ marginTop: 0 }}>{t("admin.settings.smtpTitle")}</h2>
      <p className={styles["page-description"]}>
        {t("admin.settings.smtpDescription")}
      </p>

      {error && <div className={authStyles["error-banner"]}>{error}</div>}
      {success && (
        <div className={authStyles["success-banner"]}>{success}</div>
      )}

      {updatedAt && (
        <p className={styles["meta-line"]}>
          {t("admin.settings.lastUpdated", {
            date: new Date(updatedAt).toLocaleString(),
          })}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles["config-form"]}>
          <div className={styles["smtp-server-port-row"]}>
            <div className={styles["form-field"]}>
              <label htmlFor="smtpServer">{t("admin.settings.smtpServer")}</label>
              <IconInput
                icon="link"
                variant="dashboard"
                id="smtpServer"
                type="text"
                placeholder="smtp.gmail.com"
                value={form.smtpServer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, smtpServer: e.target.value }))
                }
                required
              />
            </div>

            <div className={styles["form-field"]}>
              <label htmlFor="smtpPort">{t("admin.settings.smtpPort")}</label>
              <IconInput
                icon="hash"
                variant="dashboard"
                id="smtpPort"
                type="number"
                min={1}
                max={65535}
                value={form.smtpPort}
                onChange={(e) =>
                  setForm((f) => ({ ...f, smtpPort: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className={styles["form-field"]}>
            <label htmlFor="smtpEmailUser">{t("admin.settings.smtpEmailUser")}</label>
            <IconInput
              icon="email"
              variant="dashboard"
              id="smtpEmailUser"
              type="email"
              value={form.smtpEmailUser}
              onChange={(e) =>
                setForm((f) => ({ ...f, smtpEmailUser: e.target.value }))
              }
              required
            />
          </div>

          <div className={styles["form-field"]}>
            <label htmlFor="smtpEmailPassword">
              {t("admin.settings.smtpEmailPassword")}
            </label>
            <IconInput
              icon="lock"
              variant="dashboard"
              id="smtpEmailPassword"
              type="password"
              value={form.smtpEmailPassword}
              onChange={(e) =>
                setForm((f) => ({ ...f, smtpEmailPassword: e.target.value }))
              }
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles["form-field"]}>
            <label htmlFor="smtpBcc">
              {t("admin.settings.smtpBcc")}{" "}
              <span className={authStyles.optional}>
                {t("auth.register.optional")}
              </span>
            </label>
            <IconInput
              icon="email"
              variant="dashboard"
              id="smtpBcc"
              type="email"
              value={form.smtpBcc}
              onChange={(e) =>
                setForm((f) => ({ ...f, smtpBcc: e.target.value }))
              }
            />
          </div>

          <label className={styles["checkbox-field"]}>
            <input
              type="checkbox"
              checked={form.smtpEnabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, smtpEnabled: e.target.checked }))
              }
            />
            {t("admin.settings.smtpEnabled")}
          </label>

          <div className={styles["form-footer"]}>
            <button type="submit" className={styles["btn-save"]} disabled={saving}>
              {saving ? t("common.saving") : t("admin.settings.saveConfig")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
