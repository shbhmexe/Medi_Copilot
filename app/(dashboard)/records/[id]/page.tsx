"use client";

import { useParams, useRouter } from "next/navigation";
import { ReportDetailScreen } from "@/components/patient-portal/screens/report-detail";

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return <ReportDetailScreen id={params.id} onBack={() => router.push("/records")} />;
}
