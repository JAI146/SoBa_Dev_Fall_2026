import { formatAdminDate, formatAdminDateTime } from "@/lib/admin-format";
import { getStoredUser } from "@/lib/auth";
import base from "@/app/dashboard/dashboard.module.css";

export const apiRoot = "/admin/subscription-management";
export function formErrorMessage(cause: unknown, fallback: string): string {
  if (
    cause &&
    typeof cause === "object" &&
    "issues" in cause &&
    Array.isArray(cause.issues)
  ) {
    const issue: unknown = cause.issues[0];
    if (
      issue &&
      typeof issue === "object" &&
      "message" in issue &&
      typeof issue.message === "string"
    ) {
      if (
        /^(Expected|Required|Invalid)/.test(issue.message) &&
        "path" in issue &&
        Array.isArray(issue.path)
      ) {
        const field = (issue.path as unknown[])
          .map(String)
          .join(" ")
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .toLowerCase();
        return `Enter a valid ${field || "value"}.`;
      }
      return issue.message;
    }
  }
  return cause instanceof Error ? cause.message : fallback;
}
export function dateLabel(value: string | null, includeTime = true) {
  const formatter = includeTime ? formatAdminDateTime : formatAdminDate;
  return formatter(value, getStoredUser()?.timeZone ?? null);
}
export function optionalDate(value: FormDataEntryValue | null) {
  return typeof value === "string" && value
    ? new Date(value).toISOString()
    : null;
}
export function optionalNumber(value: FormDataEntryValue | null) {
  return typeof value === "string" && value !== "" ? Number(value) : null;
}
export function localDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (value: number) => void;
}) {
  return (
    <div className={base.pagination}>
      <span>
        {total.toLocaleString()} records · Page {page} of {totalPages}
      </span>
      <div>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
