"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FileText, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/records", label: "Records", icon: FileText },
  { href: "/booking", label: "Booking", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
];

export function PatientBottomNav() {
  const pathname = usePathname();

  if (pathname === "/notifications" || pathname.startsWith("/records/")) {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass whisper-shadow rounded-t-2xl px-6 py-3 flex justify-between items-center z-40 border-t border-outline-variant">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || (tab.href === "/records" && pathname.startsWith("/records/"));
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              isActive ? "text-primary scale-110" : "text-on-surface-variant/60"
            )}
          >
            <div className={cn("p-1 rounded-lg transition-colors", isActive ? "bg-primary/10" : "")}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
