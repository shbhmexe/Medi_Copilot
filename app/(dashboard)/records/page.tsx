"use client";

import { useRouter } from "next/navigation";
import { MedicalRecordsScreen } from "@/components/patient-portal/screens/medical-records";

export default function RecordsPage() {
  const router = useRouter();

  return <MedicalRecordsScreen onSelectRecord={(id) => router.push(`/records/${id}`)} />;
}
