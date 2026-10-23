"use client";

import { useParams } from "next/navigation";
import { CaseDetailPage } from "@/features/support-cases/case-detail-page";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <CaseDetailPage id={params.id} />;
}
