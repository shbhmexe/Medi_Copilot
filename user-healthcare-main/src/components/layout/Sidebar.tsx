import React from 'react';
import { Home, FileText, Calendar, User, Bell, LogOut, Settings, HelpCircle, Sparkles } from 'lucide-react';
import { Screen } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface SidebarProps {
  activeTab: Screen;
  onTabChange: (tab: Screen) => void;
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'records', label: 'Medical Records', icon: FileText },
    { id: 'booking', label: 'Appointments', icon: Calendar },
    { id: 'profile', label: 'Health Profile', icon: User },
  ];

  const secondaryItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help Center', icon: HelpCircle },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-surface-lowest border-r border-outline-variant h-screen sticky top-0 left-0 p-6 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Sparkles size={24} />
        </div>
        <h1 className="text-xl font-headline font-extrabold text-on-surface tracking-tight">Vitalis AI</h1>
      </div>

      {/* Main Menu */}
      <div className="flex-1 space-y-8">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-4">Main Menu</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'records' && activeTab === 'report-detail');
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as Screen)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group",
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/10" 
                    : "text-on-surface-variant hover:bg-surface-low hover:text-primary"
                )}
              >
                <Icon size={20} className={cn("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-primary")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-4">Support</p>
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as Screen)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-on-surface-variant hover:bg-surface-low hover:text-primary"
                )}
              >
                <Icon size={20} className="text-on-surface-variant/60 group-hover:text-primary" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile Card */}
      <div className="mt-auto pt-6 border-t border-outline-variant/30">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-surface-low border border-outline-variant/20">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/10">
            <img src="https://i.pravatar.cc/150?u=aakash" alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">Aakash Rana</p>
            <p className="text-[10px] text-on-surface-variant/60 font-medium truncate">Premium Member</p>
          </div>
          <button className="p-2 text-on-surface-variant/40 hover:text-error transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
