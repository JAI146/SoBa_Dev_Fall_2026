import { redirect } from "next/navigation";
export default function NotificationsRedirect() {
  redirect("/dashboard/settings/notifications");
}
