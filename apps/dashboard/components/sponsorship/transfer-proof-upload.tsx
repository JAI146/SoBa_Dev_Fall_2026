"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@muakhah/i18n";
import type { SponsorshipListItem, TransferProofListItem } from "@muakhah/contracts";
import { ReceivingMethodsNameSelector } from "@/components/donor/receiving-methods-name-selector";
import { API_BASE } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { transferProofStatusClass } from "@/lib/transfer-proof-status";
import {
  formatTransferAmount,
  formatTransferDate,
} from "@/lib/transfer-proof-display";
import styles from "@/app/dashboard/dashboard.module.css";
import authStyles from "@/app/auth.module.css";

type TransferProofUploadProps = {
  sponsorship: SponsorshipListItem;
  onUploaded?: () => void;
};

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileDocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function todayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function TransferProofUpload({
  sponsorship,
  onUploaded,
}: TransferProofUploadProps) {
  const { t, te } = useI18n();
  const defaultAmount = useMemo(
    () => sponsorship.monthlyAmount.toFixed(2),
    [sponsorship.monthlyAmount],
  );
  const [proofs, setProofs] = useState<TransferProofListItem[]>([]);
  const [approvedCount, setApprovedCount] = useState(
    sponsorship.approvedTransferCount ?? 0,
  );
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState(defaultAmount);
  const [transferDate, setTransferDate] = useState(() => todayDateInputValue());
  const [receivingMethodIndex, setReceivingMethodIndex] = useState<number | null>(
    sponsorship.selectedReceivingMethods.length === 1 ? 0 : null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(defaultAmount);
  }, [defaultAmount, sponsorship.id]);

  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const loadProofs = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE}/donor/sponsorships/${encodeURIComponent(sponsorship.id)}/transfer-proofs`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const data = (await res.json()) as {
        transferProofs?: TransferProofListItem[];
        approvedCount?: number;
      };
      if (res.ok) {
        setProofs(data.transferProofs ?? []);
        setApprovedCount(data.approvedCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [sponsorship.id]);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

  const amountValue = Number(amount);
  const canSubmit =
    Boolean(file) &&
    receivingMethodIndex !== null &&
    amount.trim() !== "" &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    transferDate !== "";

  function assignFile(next: File | undefined) {
    if (!next) return;
    const ok =
      next.type.startsWith("image/") || next.type === "application/pdf";
    if (!ok) return;
    setFile(next);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || receivingMethodIndex === null || !file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("notes", notes.trim());
    formData.append("receivingMethodIndex", String(receivingMethodIndex));
    formData.append("amount", amount.trim());
    formData.append("transferDate", transferDate);

    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE}/donor/sponsorships/${encodeURIComponent(sponsorship.id)}/transfer-proofs`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
        approvedCount?: number;
      };
      if (!res.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message || t("sponsorships.transferProof.uploadFailed");
        throw new Error(message);
      }
      setFile(null);
      setNotes("");
      setAmount(defaultAmount);
      setTransferDate(todayDateInputValue());
      if (typeof data.approvedCount === "number") {
        setApprovedCount(data.approvedCount);
      }
      await loadProofs();
      onUploaded?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("sponsorships.transferProof.uploadFailed"),
      );
    } finally {
      setUploading(false);
    }
  }

  const methods = sponsorship.selectedReceivingMethods;

  return (
    <section className={styles["sponsorship-action-panel"]}>
      <h3>{t("sponsorships.transferProof.title")}</h3>
      <p className={styles["form-hint"]}>{t("sponsorships.transferProof.hint")}</p>

      <dl className={styles["family-detail-list"]} style={{ marginBottom: "1rem" }}>
        <div className={styles["family-detail-row"]}>
          <dt>{t("sponsorships.transferProof.approvedCountLabel")}</dt>
          <dd>{approvedCount}</dd>
        </div>
      </dl>
      <p className={styles["form-hint"]}>{t("sponsorships.transferProof.approvedCountHint")}</p>

      {error && <div className={authStyles["error-banner"]}>{error}</div>}

      <form onSubmit={(e) => void handleUpload(e)} className={styles["form-grid"]}>
        {methods.length > 0 && (
          <div className={`${styles["form-field"]} ${styles.full}`}>
            <label>{t("sponsorships.transferProof.receivingMethodLabel")}</label>
            <p className={styles["form-hint"]}>
              {t("sponsorships.transferProof.receivingMethodRequired")}
            </p>
            <ReceivingMethodsNameSelector
              methods={methods}
              selectedIndex={receivingMethodIndex}
              onChange={setReceivingMethodIndex}
            />
          </div>
        )}
        <div className={styles["form-field"]}>
          <label htmlFor={`transfer-amount-${sponsorship.id}`}>
            {t("sponsorships.transferProof.amountLabel")}
          </label>
          <input
            id={`transfer-amount-${sponsorship.id}`}
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("sponsorships.transferProof.amountPlaceholder")}
          />
        </div>
        <div className={styles["form-field"]}>
          <label htmlFor={`transfer-date-${sponsorship.id}`}>
            {t("sponsorships.transferProof.transferDateLabel")}
          </label>
          <input
            id={`transfer-date-${sponsorship.id}`}
            type="date"
            required
            max={todayDateInputValue()}
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
          />
        </div>
        <div className={`${styles["form-field"]} ${styles.full}`}>
          <input
            id={`transfer-proof-${sponsorship.id}`}
            type="file"
            accept="image/*,application/pdf"
            required
            className={authStyles["file-input-hidden"]}
            onChange={(e) => assignFile(e.target.files?.[0])}
          />
          <label
            htmlFor={`transfer-proof-${sponsorship.id}`}
            className={`${authStyles["file-upload-zone"]} ${file ? authStyles["has-file"] : ""} ${dragOver ? authStyles["drag-over"] : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              assignFile(e.dataTransfer.files[0]);
            }}
          >
            {file ? (
              <div className={authStyles["file-preview-wrap"]}>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={t("sponsorships.transferProof.previewAlt")}
                    className={authStyles["file-preview-thumb"]}
                  />
                ) : (
                  <div className={authStyles["file-preview-doc"]}>
                    <FileDocIcon />
                  </div>
                )}
                <div className={authStyles["file-preview-info"]}>
                  <div className={authStyles["file-preview-name"]}>{file.name}</div>
                  <div className={authStyles["file-preview-change"]}>
                    {t("sponsorships.transferProof.changeFile")}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className={authStyles["file-upload-icon"]}>
                  <UploadIcon />
                </div>
                <div className={authStyles["file-upload-title"]}>
                  {t("sponsorships.transferProof.uploadTitle")}
                </div>
                <div className={authStyles["file-upload-hint"]}>
                  {t("sponsorships.transferProof.uploadHint")}
                </div>
              </>
            )}
          </label>
        </div>
        <div className={`${styles["form-field"]} ${styles.full}`}>
          <label htmlFor={`transfer-notes-${sponsorship.id}`}>
            {t("sponsorships.transferProof.notesLabel")}
          </label>
          <textarea
            id={`transfer-notes-${sponsorship.id}`}
            rows={2}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className={`${styles["form-footer"]} ${styles.full}`}>
          <button
            type="submit"
            className={styles["btn-primary-inline"]}
            disabled={uploading || !canSubmit}
          >
            {uploading
              ? t("sponsorships.transferProof.uploading")
              : t("sponsorships.transferProof.uploadCta")}
          </button>
        </div>
      </form>

      {loading ? (
        <p className={styles["form-hint"]}>{t("common.loading")}</p>
      ) : proofs.length > 0 ? (
        <ul className={styles["transfer-proof-list"]}>
          {proofs.map((proof) => (
            <li key={proof.id} className={styles["transfer-proof-item"]}>
              <div className={styles["transfer-proof-item-header"]}>
                <span
                  className={`${styles["status-badge"]} ${transferProofStatusClass(proof.status)}`}
                >
                  {te("transferProofStatus", proof.status)}
                </span>
                <time>{new Date(proof.createdAt).toLocaleString()}</time>
              </div>
              {proof.amount != null && (
                <span>
                  {t("sponsorships.transferProof.amountLabel")}:{" "}
                  {formatTransferAmount(proof.amount)}
                </span>
              )}
              {proof.transferDate && (
                <span>
                  {t("sponsorships.transferProof.transferDateLabel")}:{" "}
                  {formatTransferDate(proof.transferDate)}
                </span>
              )}
              {proof.receivingMethodType && (
                <span>
                  {t("sponsorships.transferProof.receivingMethodLabel")}:{" "}
                  {t(`families.receivingMethods.${proof.receivingMethodType}`)}
                </span>
              )}
              <a
                href={proof.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles["text-link"]}
              >
                {t("sponsorships.transferProof.viewFile")}
              </a>
              {proof.notes && <span>{proof.notes}</span>}
              {proof.adminNotes && (
                <div className={styles["transfer-proof-admin-notes"]}>
                  <strong>{t("sponsorships.transferProof.adminNotesLabel")}:</strong>{" "}
                  {proof.adminNotes}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles["form-hint"]}>{t("sponsorships.transferProof.empty")}</p>
      )}
    </section>
  );
}
