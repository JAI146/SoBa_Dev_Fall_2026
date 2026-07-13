import { redirect } from "next/navigation";

export default function AdminSettingsPage() {
  redirect("/dashboard/admin/settings/config/s3");
}
