"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { filterPatientsForClinician } from "@/lib/roles";
import { useAuthStore, usePatientStore, useConsultationStore } from "@/store";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Pill,
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";

const navItems = [
  { id: "dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "patients", href: "/patients", icon: Users, label: "Patients" },
  { id: "queue", href: "/queue", icon: CalendarClock, label: "Today's Queue" },
  { id: "drug-checker", href: "/drug-checker", icon: Pill, label: "Drug Checker" },
  { id: "analytics", href: "/analytics", icon: BarChart3, label: "Analytics" },
  { id: "settings", href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { patients } = usePatientStore();
  const { interactions } = useConsultationStore();

  const visiblePatients = filterPatientsForClinician(patients, user);
  const casesSeen = visiblePatients.length;
  // Count how many patients have been actively parsed through ai model
  const aiAnalyses = visiblePatients.filter((p) => p.rawText || p.clinicalFields || p.modelResult).length;
  const drugAlerts = interactions.length;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    router.push("/login");
  };

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-[#F7F9F9] border-r border-[#E2E8F0] shadow-[1px_0px_2px_rgba(0,0,0,0.02)]">
      {/* Logo Section */}
      <div className="px-6 py-10">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold text-[#14532d] font-serif leading-none">MedCoPilot</h1>
          <p className="text-[8px] font-bold tracking-[0.2em] text-[#15803d]/60 uppercase">Clinical Decision Support</p>
        </div>
      </div>

      {/* Nav Section */}
      <nav className="flex-1 px-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.id} href={item.href}>
              <motion.div
                whileHover={{ x: 3 }}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#16a34a] text-white shadow-lg shadow-green-600/15"
                    : "text-[#64748b] hover:text-[#16a34a] hover:bg-white"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-white" : "text-[#94a3b8] opacity-70"} />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Stats Section */}
      <div className="mx-4 mb-6 p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
        <h3 className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase mb-4">Today&rsquo;s Stats</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-[#475569]">
            <span>Cases Seen</span>
            <span className="text-[#16a34a] font-mono">{casesSeen}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-[#475569]">
            <span>AI Analyses</span>
            <span className="text-[#16a34a] font-mono">{aiAnalyses}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-[#475569]">
            <span>Drug Alerts</span>
            <span className="text-[#ca8a04] font-mono">{drugAlerts}</span>
          </div>
        </div>
      </div>

      {/* Bottom User Bar */}
      <div className="px-4 py-6 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 border border-[#16a34a]/20 flex items-center justify-center overflow-hidden">
               <span className="text-sm font-bold text-[#14532d]">{user?.name?.slice(0, 2).toUpperCase() || "DR"}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#1e293b] truncate">{user?.name || "Clinician"}</p>
            <p className="text-[9px] font-bold tracking-widest text-[#16a34a] uppercase truncate">
              {user?.specialty || (user?.role === "admin" ? "Clinic Admin" : "On Call")}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-[#94a3b8] hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
