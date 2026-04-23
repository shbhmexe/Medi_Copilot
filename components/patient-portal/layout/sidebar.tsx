"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { useAuthStore, usePatientPortalStore } from "@/store";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/records", label: "Medical Records", icon: FileText },
  { href: "/booking", label: "Appointments", icon: Calendar },
  { href: "/profile", label: "Health Profile", icon: User },
];

const secondaryItems = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help Center", icon: HelpCircle },
];

export function PatientSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { profiles, ensureProfile } = usePatientPortalStore();

  const profile = user ? profiles[user.id] : null;

  useEffect(() => {
    if (user && !profile) {
      ensureProfile(user);
    }
  }, [ensureProfile, profile, user]);

  const initials =
    user?.name
      ?.split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "PT";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-surface-lowest border-r border-outline-variant h-screen sticky top-0 left-0 p-6 z-50">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Sparkles size={24} />
        </div>
        <h1 className="text-xl font-headline font-extrabold text-on-surface tracking-tight">Vitalis AI</h1>
      </div>

      <div className="flex-1 space-y-8">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-4">
            Main Menu
          </p>
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/records" && pathname.startsWith("/records/"));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/10"
                    : "text-on-surface-variant hover:bg-surface-low hover:text-primary"
                )}
              >
                <Icon
                  size={20}
                  className={cn(
                    "transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-primary"
                  )}
                />
                {item.label}
                {isActive ? <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" /> : null}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-4">
            Support
          </p>
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-low hover:text-primary"
                )}
              >
                <Icon size={20} className="text-on-surface-variant/60 group-hover:text-primary" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-outline-variant/30">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-surface-low border border-outline-variant/20">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/10 bg-primary/10 text-primary flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{user?.name || "Patient"}</p>
            <p className="text-[10px] text-on-surface-variant/60 font-medium truncate">
              {profile?.patientCode ? `Patient ID: ${profile.patientCode}` : "Complete your profile"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-on-surface-variant/40 hover:text-destructive transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
