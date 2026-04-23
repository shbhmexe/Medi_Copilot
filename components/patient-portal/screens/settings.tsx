"use client";

import { useEffect } from "react";
import {
  Accessibility,
  Bell,
  ChevronRight,
  Heart,
  LogOut,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/patient-portal/ui/base";
import { cn } from "@/lib/utils";
import { useAuthStore, usePatientPortalStore } from "@/store";

export function PatientSettingsScreen() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { ensureProfile, profiles, preferences, updatePreferences } = usePatientPortalStore();

  useEffect(() => {
    ensureProfile(user);
  }, [ensureProfile, user]);

  if (!user) return null;

  const profile = profiles[user.id];
  const userPreferences = preferences[user.id] || {
    appointmentReminders: true,
    reportAlerts: true,
    generalNotifications: true,
    aiSuggestions: true,
    shareHistoryWithDoctor: true,
  };

  const sections = [
    {
      id: "account",
      title: "Account",
      icon: User,
      color: "text-primary",
      bg: "bg-primary/10",
      items: [
        { label: "Profile Details", desc: `${profile?.fullName || user.name} · ${profile?.phone || "Phone not added"}`, action: "Edit", href: "/profile" },
        { label: "Email", desc: profile?.email || user.email, action: "Review" },
        { label: "Patient Code", desc: profile?.patientCode || "Not generated", action: "View" },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      items: [
        { label: "Appointment Reminders", desc: "Receive reminders for booked visits", toggle: true, active: userPreferences.appointmentReminders, key: "appointmentReminders" as const },
        { label: "Report Alerts", desc: "Get notified when a record is added", toggle: true, active: userPreferences.reportAlerts, key: "reportAlerts" as const },
        { label: "General Updates", desc: "Receive portal activity notifications", toggle: true, active: userPreferences.generalNotifications, key: "generalNotifications" as const },
      ],
    },
    {
      id: "health",
      title: "Health Data",
      icon: Heart,
      color: "text-destructive",
      bg: "bg-destructive/10",
      items: [
        { label: "Past History", desc: profile?.pastHistory || "Not added", action: "Update", href: "/profile" },
        { label: "Allergies", desc: profile?.allergies || "Not added", action: "Update", href: "/profile" },
        { label: "Current Medications", desc: profile?.currentMedications || "Not added", action: "Update", href: "/profile" },
      ],
    },
    {
      id: "privacy",
      title: "Privacy & Sharing",
      icon: Shield,
      color: "text-tertiary",
      bg: "bg-tertiary/10",
      items: [
        {
          label: "Share History With Doctor",
          desc: "Include profile history in appointment QR and doctor route",
          toggle: true,
          active: userPreferences.shareHistoryWithDoctor,
          key: "shareHistoryWithDoctor" as const,
        },
      ],
    },
    {
      id: "ai",
      title: "AI Settings",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      items: [
        {
          label: "AI Suggestions",
          desc: "Allow smart health prompts inside the patient dashboard",
          toggle: true,
          active: userPreferences.aiSuggestions,
          key: "aiSuggestions" as const,
        },
      ],
    },
    {
      id: "accessibility",
      title: "Language & Accessibility",
      icon: Accessibility,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      items: [
        { label: "Language", desc: user.preferred_language?.toUpperCase() || "EN", action: "Default" },
        { label: "Profile Completion", desc: `${profile ? "Ready to manage from profile page" : "Not ready yet"}`, action: "Open", href: "/profile" },
      ],
    },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header>
        <h1 className="text-2xl font-headline font-extrabold">Settings</h1>
        <p className="text-sm text-on-surface-variant">
          Manage your account, notification preferences, and data sharing controls
        </p>
      </header>

      <div className="space-y-6">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <section key={section.id} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className={cn("p-2 rounded-xl", section.bg, section.color)}>
                  <SectionIcon size={18} />
                </div>
                <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">{section.title}</h2>
              </div>

              <Card className="p-0 overflow-hidden border border-outline-variant/20">
                <div className="divide-y divide-outline-variant/10">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="p-4 flex items-center justify-between hover:bg-surface-low/50 transition-colors gap-4"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface">{item.label}</p>
                        <p className="text-xs text-on-surface-variant/60 truncate">{item.desc}</p>
                      </div>

                      {"toggle" in item && item.toggle ? (
                        <button
                          type="button"
                          onClick={() => updatePreferences(user.id, { [item.key]: !item.active })}
                          className={cn("w-10 h-5 rounded-full transition-all relative", item.active ? "bg-primary" : "bg-surface-high")}
                        >
                          <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", item.active ? "left-6" : "left-1")} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ("href" in item && item.href ? router.push(item.href) : undefined)}
                          className="text-xs font-bold flex items-center gap-1 transition-colors text-primary hover:text-primary/70"
                        >
                          {"action" in item ? item.action : "Open"}
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          );
        })}
      </div>

      <div className="pt-4">
        <Button variant="secondary" className="w-full text-destructive hover:bg-destructive/5 border-destructive/10" onClick={handleLogout}>
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
