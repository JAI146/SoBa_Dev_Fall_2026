"use client";

import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { S3ConfigPublic } from "@muakhah/contracts";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "../../../../dashboard.module.css";
import authStyles from "../../../../../auth.module.css";

export default function S3ConfigPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    region: "",
    bucket: "",
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
        const data = await apiRequest<{ config: S3ConfigPublic | null }>(
          "/admin/settings/s3",
          {},
          token,
        );
        if (data.config) {
          setForm({
            accessKeyId: data.config.accessKeyId,
            secretAccessKey: data.config.secretAccessKey,
            region: data.config.region,
            bucket: data.config.bucket,
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
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const token = getToken();
      const data = await apiRequest<{ config: S3ConfigPublic }>(
        "/admin/settings/s3",
        {
          method: "PUT",
          body: JSON.stringify(form),
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
    return <div className={styles.card}>{t("admin.settings.loading")}</div>;
  }

  return (
    <div className={styles.card}>
      <h2 style={{ marginTop: 0 }}>{t("admin.settings.s3Title")}</h2>
      <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
        {t("admin.settings.s3Description")}
      </p>

      {error && <div className={authStyles["error-banner"]}>{error}</div>}
      {success && (
        <div className={authStyles["success-banner"]}>{success}</div>
      )}

      {updatedAt && (
        <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
          {t("admin.settings.lastUpdated", {
            date: new Date(updatedAt).toLocaleString(),
          })}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className={authStyles["form-group"]}>
          <label htmlFor="accessKeyId">{t("admin.settings.accessKey")}</label>
          <input
            id="accessKeyId"
            type="text"
            value={form.accessKeyId}
            onChange={(e) =>
              setForm((f) => ({ ...f, accessKeyId: e.target.value }))
            }
            required
          />
        </div>

        <div className={authStyles["form-group"]}>
          <label htmlFor="secretAccessKey">{t("admin.settings.secretKey")}</label>
          <input
            id="secretAccessKey"
            type="password"
            value={form.secretAccessKey}
            onChange={(e) =>
              setForm((f) => ({ ...f, secretAccessKey: e.target.value }))
            }
            required
          />
        </div>

        <div className={authStyles["form-group"]}>
          <label htmlFor="region">{t("admin.settings.region")}</label>
          <input
            id="region"
            type="text"
            placeholder={t("admin.settings.regionPlaceholder")}
            value={form.region}
            onChange={(e) =>
              setForm((f) => ({ ...f, region: e.target.value }))
            }
            required
          />
        </div>

        <div className={authStyles["form-group"]}>
          <label htmlFor="bucket">{t("admin.settings.bucket")}</label>
          <input
            id="bucket"
            type="text"
            value={form.bucket}
            onChange={(e) =>
              setForm((f) => ({ ...f, bucket: e.target.value }))
            }
            required
          />
        </div>

        <button
          type="submit"
          className={styles["btn-save"]}
          disabled={saving}
        >
          {saving ? t("common.saving") : t("admin.settings.saveConfig")}
        </button>
      </form>
    </div>
  );
}
