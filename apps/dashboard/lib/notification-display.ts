import { formatEnum } from "./admin-format";
const labels: Record<string, string> = {
  processing: "Sending / confirmation pending",
  delivery_uncertain: "Delivery unconfirmed — investigate",
  manual_send_required: "Ready for a manual send after the planned time",
  blocked: "Blocked",
  suppressed: "Not eligible",
  retry_pending: "Retry scheduled",
  provider_not_configured: "Sending is not connected",
  automation_disabled: "Automatic inactivity email is turned off",
  customer_app_url_required: "Customer app link needs server configuration",
  demo_address: "Demo address — no email sent",
  temporary_delivery_failure: "Temporary rejection — waiting to retry",
  optional_opt_out: "Customer turned off these notifications",
  category_unavailable: "Category or channel is turned off",
  account_inactive: "Account is not active",
  customer_active: "Customer has returned",
  frequency_limit: "Reminder limit reached",
  quiet_hours: "Waiting for quiet hours to end",
  unknown_error: "Needs investigation",
  provider_unavailable: "Service unavailable",
  generation_failed: "Could not create message",
  delivery_failed: "Could not send message",
  content_filtered: "Content filtered",
  rate_limited: "Usage limit reached",
  review_required: "Needs review",
  development_sample: "Test data",
  provider_event: "Provider event",
};
export function notificationLabel(value: string) {
  return labels[value] ?? formatEnum(value);
}
