"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import {
  legalDocumentSlugs,
  type LegalDocumentPublic,
  type LegalDocumentSlugValue,
} from "@muakhah/contracts";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import styles from "../../dashboard.module.css";
import authStyles from "../../../auth.module.css";

type DocumentMap = Record<LegalDocumentSlugValue, LegalDocumentPublic>;

function emptyDocumentMap(): DocumentMap {
  return legalDocumentSlugs.reduce((acc, slug) => {
    acc[slug] = {
      slug,
      contentEn: "",
      contentAr: "",
      updatedAt: new Date().toISOString(),
    };
    return acc;
  }, {} as DocumentMap);
}

export default function LegalPoliciesPage() {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<DocumentMap>(emptyDocumentMap);
  const [activeSlug, setActiveSlug] =
    useState<LegalDocumentSlugValue>("terms_of_use");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toolbarLabels = useMemo(
    () => ({
      bold: t("admin.legal.toolbar.bold"),
      italic: t("admin.legal.toolbar.italic"),
      underline: t("admin.legal.toolbar.underline"),
      heading2: t("admin.legal.toolbar.heading2"),
      heading3: t("admin.legal.toolbar.heading3"),
      bulletList: t("admin.legal.toolbar.bulletList"),
      numberedList: t("admin.legal.toolbar.numberedList"),
      link: t("admin.legal.toolbar.link"),
      linkPrompt: t("admin.legal.toolbar.linkPrompt"),
    }),
    [t],
  );

  const loadDocuments = useCallback(async () => {
    setError(null);
    try {
      const token = getToken();
      const data = await apiRequest<{ documents: LegalDocumentPublic[] }>(
        "/admin/legal-documents",
        {},
        token,
      );
      const next = emptyDocumentMap();
      for (const doc of data.documents) {
        next[doc.slug] = doc;
      }
      setDocuments(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.legal.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const activeDoc = documents[activeSlug];

  function updateActiveField(field: "contentEn" | "contentAr", value: string) {
    setDocuments((prev) => ({
      ...prev,
      [activeSlug]: {
        ...prev[activeSlug],
        [field]: value,
      },
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const token = getToken();
      const data = await apiRequest<{ document: LegalDocumentPublic }>(
        `/admin/legal-documents/${activeSlug}`,
        {
          method: "PUT",
          body: JSON.stringify({
            contentEn: activeDoc.contentEn,
            contentAr: activeDoc.contentAr,
          }),
        },
        token,
      );
      setDocuments((prev) => ({
        ...prev,
        [activeSlug]: data.document,
      }));
      setSuccess(t("admin.legal.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.legal.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.card}>{t("admin.legal.loading")}</div>;
  }

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/admin">{t("common.admin")}</Link> /{" "}
        {t("admin.legal.title")}
      </div>
      <div className={styles["page-header"]}>
        <h1>{t("admin.legal.title")}</h1>
        <p className={styles["page-description"]}>{t("admin.legal.description")}</p>
      </div>

      <div className={styles["tab-buttons"]}>
        {legalDocumentSlugs.map((slug) => (
          <button
            key={slug}
            type="button"
            className={activeSlug === slug ? styles.active : ""}
            onClick={() => {
              setActiveSlug(slug);
              setSuccess(null);
              setError(null);
            }}
          >
            {t(`admin.legal.policies.${slug}`)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={`${styles.card} ${styles["card-wide"]}`}>
        {error && <div className={authStyles["error-banner"]}>{error}</div>}
        {success && <div className={authStyles["success-banner"]}>{success}</div>}

        {activeDoc.updatedAt && (
          <p className={styles["meta-line"]}>
            {t("admin.legal.lastUpdated", {
              date: new Date(activeDoc.updatedAt).toLocaleString(),
            })}
          </p>
        )}

        <div className={styles["legal-editors"]}>
          <RichTextEditor
            label={t("admin.legal.english")}
            value={activeDoc.contentEn}
            onChange={(html) => updateActiveField("contentEn", html)}
            dir="ltr"
            placeholder={t("admin.legal.editorPlaceholder")}
            toolbarLabels={toolbarLabels}
          />
          <RichTextEditor
            label={t("admin.legal.arabic")}
            value={activeDoc.contentAr}
            onChange={(html) => updateActiveField("contentAr", html)}
            dir="rtl"
            placeholder={t("admin.legal.editorPlaceholder")}
            toolbarLabels={toolbarLabels}
          />
        </div>

        <div className={styles["form-footer"]}>
          <button type="submit" className={styles["btn-save"]} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </>
  );
}
