"use client";

import { useRouter } from "next/navigation";
import { NotificationsScreen } from "@/components/patient-portal/screens/notifications";

export default function NotificationsPage() {
  const router = useRouter();

  return <NotificationsScreen onBack={() => router.push("/dashboard")} />;
}
