import React, { useState } from 'react';
import { 
  User, Bell, Shield, Sparkles, Languages, Accessibility, 
  ChevronRight, LogOut, Trash2, Lock, Eye, EyeOff, 
  Moon, Sun, Type, Heart, AlertCircle, Pill, Calendar, FileText
} from 'lucide-react';
import { Card, Button, Badge } from '@/src/components/ui/Base';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export const Settings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  const sections = [
    {
      id: 'account',
      title: 'Account',
      icon: User,
      color: 'text-primary',
      bg: 'bg-primary/10',
      items: [
        { label: 'Profile Details', desc: 'Name, email, and phone number', action: 'Edit' },
        { label: 'Subscription', desc: 'Premium Member • Renew Oct 2026', action: 'Manage' },
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      items: [
        { label: 'Medicine Reminders', desc: 'Push notifications for daily doses', toggle: true, active: true },
        { label: 'Appointments', desc: 'Reminders for upcoming visits', toggle: true, active: true },
        { label: 'Lab Reports', desc: 'Alerts when new results are ready', toggle: true, active: true },
      ]
    },
    {
      id: 'health',
      title: 'Health Preferences',
      icon: Heart,
      color: 'text-error',
      bg: 'bg-error/10',
      items: [
        { label: 'Chronic Conditions', desc: 'Hypertension, Type 2 Diabetes', action: 'Update' },
        { label: 'Allergies', desc: 'Penicillin, Peanuts', action: 'Update' },
        { label: 'Current Medications', desc: 'Atorvastatin, Metformin', action: 'Update' },
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: Shield,
      color: 'text-tertiary',
      bg: 'bg-tertiary/10',
      items: [
        { label: 'App Lock', desc: 'Require FaceID or PIN to open', toggle: true, active: false },
        { label: 'Data Control', desc: 'Export or download your health data', action: 'Export' },
        { label: 'Delete Account', desc: 'Permanently remove all data', action: 'Delete', danger: true },
      ]
    },
    {
      id: 'ai',
      title: 'AI Settings',
      icon: Sparkles,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      items: [
        { label: 'AI Suggestions', desc: 'Receive smart health insights', toggle: true, active: aiSuggestions, onToggle: () => setAiSuggestions(!aiSuggestions) },
        { label: 'Explanation Level', desc: 'Detailed • Technical vs Simple', action: 'Change' },
      ]
    },
    {
      id: 'accessibility',
      title: 'Language & Accessibility',
      icon: Accessibility,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      items: [
        { label: 'Language', desc: 'English (US)', action: 'Change' },
        { label: 'Font Size', desc: 'Medium (Default)', action: 'Adjust' },
        { label: 'Dark Mode', desc: 'System default', toggle: true, active: darkMode, onToggle: () => setDarkMode(!darkMode) },
      ]
    }
  ];

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header>
        <h1 className="text-2xl font-headline font-extrabold">Settings</h1>
        <p className="text-sm text-on-surface-variant">Manage your account, privacy, and health preferences</p>
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
                  {section.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-surface-low/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-on-surface">{item.label}</p>
                        <p className="text-xs text-on-surface-variant/60">{item.desc}</p>
                      </div>
                      
                      {item.toggle ? (
                        <button 
                          onClick={item.onToggle}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative",
                            item.active ? "bg-primary" : "bg-surface-high"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                            item.active ? "left-6" : "left-1"
                          )} />
                        </button>
                      ) : (
                        <button className={cn(
                          "text-xs font-bold flex items-center gap-1 transition-colors",
                          item.danger ? "text-error hover:text-error/80" : "text-primary hover:text-primary-container"
                        )}>
                          {item.action}
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
        <Button variant="secondary" className="w-full text-error hover:bg-error/5 border-error/10">
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
