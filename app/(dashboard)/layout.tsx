"use client";
import { PersistSyncBridge } from "@/components/app/persist-sync-bridge";
import { Sidebar as DoctorSidebar } from "@/components/layout/sidebar";
import { BottomNav as DoctorBottomNav } from "@/components/layout/bottom-nav";
import { PatientSidebar } from "@/components/patient-portal/layout/sidebar";
import { PatientBottomNav } from "@/components/patient-portal/layout/bottom-nav";
import { isDoctorOnlyPath, isPatientOnlyPath, isPatientRole } from "@/lib/roles";
import { useAuthStore } from "@/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isPatientPortal = isPatientRole(user?.role);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (isPatientPortal && isDoctorOnlyPath(pathname)) {
      router.replace("/dashboard");
      return;
    }

    if (!isPatientPortal && isPatientOnlyPath(pathname)) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isPatientPortal, mounted, pathname, router]);

  // Prevent hydration mismatch and effectively "protect" the route based on local storage
  if (!mounted || !isAuthenticated) return null;

  if ((isPatientPortal && isDoctorOnlyPath(pathname)) || (!isPatientPortal && isPatientOnlyPath(pathname))) {
    return null;
  }

  return (
    <div className={`flex min-h-screen ${isPatientPortal ? "bg-surface" : "bg-white"}`}>
      <PersistSyncBridge />
      <div className="hidden lg:flex">
        {isPatientPortal ? <PatientSidebar /> : <DoctorSidebar />}
      </div>
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
      {isPatientPortal ? <PatientBottomNav /> : <DoctorBottomNav />}
    </div>
  );
}
