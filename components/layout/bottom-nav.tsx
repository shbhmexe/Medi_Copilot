"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  CalendarClock, 
  Pill, 
  BarChart3, 
  Settings 
} from "lucide-react";

const navItems = [
  { id: "dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "patients", href: "/patients", icon: Users, label: "Patients" },
  { id: "queue", href: "/queue", icon: CalendarClock, label: "Queue" },
  { id: "drug-checker", href: "/drug-checker", icon: Pill, label: "Drug Check" },
  { id: "analytics", href: "/analytics", icon: BarChart3, label: "Analytics" },
  { id: "settings", href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-1 left-4 right-4 h-16 bg-[#F1FDF4]/90 backdrop-blur-md border border-[#dcfce7] rounded-2xl shadow-2xl flex items-center justify-around px-4 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link key={item.id} href={item.href} className="flex flex-col items-center gap-1 group">
            <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-[#16a34a] text-white' : 'text-[#64748b] group-hover:text-[#16a34a]'}`}>
               <item.icon size={18} />
            </div>
            <span className={`text-[8px] font-bold tracking-widest uppercase ${isActive ? 'text-[#16a34a]' : 'text-[#94a3b8]'}`}>
               {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
