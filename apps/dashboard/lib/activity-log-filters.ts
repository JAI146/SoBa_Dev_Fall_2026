import { ActivityAction } from "@muakhah/contracts";

export type ActivityLogFilters = {
  search: string;
  action: string;
  entityType: string;
};

export const EMPTY_ACTIVITY_LOG_FILTERS: ActivityLogFilters = {
  search: "",
  action: "",
  entityType: "",
};

export const ACTIVITY_LOG_ENTITY_TYPES = [
  "family",
  "sponsorship",
  "user",
  "transfer_proof",
  "chat_message",
  "sponsor_ticket",
] as const;

export const ACTIVITY_LOG_ACTION_OPTIONS = Object.values(ActivityAction).sort();

export function hasActiveActivityLogFilters(filters: ActivityLogFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.action !== "" ||
    filters.entityType !== ""
  );
}

export function buildActivityLogQuery(
  filters: ActivityLogFilters,
  page: number,
  limit: number,
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  const search = filters.search.trim();
  if (search) params.set("search", search);
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  return params.toString();
}
