"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PatientSettingsScreen } from "@/components/patient-portal/screens/settings";
import { isPatientRole } from "@/lib/roles";
import { useAuthStore } from "@/store";
import { 
  User, 
  Palette,
  CheckCircle2,
  Lock,
  Stethoscope,
  Terminal
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState("Profile");

  if (isPatientRole(user?.role)) {
    return <PatientSettingsScreen />;
  }

  const sections = [
    { id: "Profile", icon: User, label: "Profile & Identity" },
    { id: "Clinical", icon: Stethoscope, label: "Clinical Parameters" },
    { id: "Security", icon: Lock, label: "Security & Encryption" },
    { id: "Preferences", icon: Palette, label: "App Appearance" },
    { id: "Advanced", icon: Terminal, label: "Engine Debugging" },
  ];

  return (
    <div className="p-10 max-w-6xl mx-auto bg-white min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-bold font-serif text-[#1e293b] mb-2">Settings</h1>
        <p className="text-sm font-bold text-[#94a3b8]">Configure your clinical environment and AI integrity</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Nav */}
        <aside className="w-full lg:w-64 space-y-2 shrink-0">
           {sections.map(s => (
             <button 
               key={s.id}
               onClick={() => setActiveSection(s.id)}
               className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                 activeSection === s.id ? 'bg-[#16a34a] text-white shadow-lg shadow-green-600/15' : 'text-[#64748b] hover:bg-[#F1F5F9]'
               }`}
             >
               <s.icon size={18} />
               {s.label}
             </button>
           ))}
        </aside>

        {/* Dynamic Content */}
        <div className="flex-1 space-y-10">
           <AnimatePresence mode="wait">
             <motion.div 
               key={activeSection}
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -10 }}
               className="bg-[#f8fafb] border border-[#E2E8F0] rounded-2xl p-10"
             >
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-bold font-serif text-[#1e293b]">{activeSection}</h3>
                   <div className="flex gap-4">
                      <button className="px-6 py-2 bg-white border border-[#E2E8F0] text-[#94a3b8] text-[10px] font-bold tracking-widest uppercase rounded-lg hover:border-[#CBD5E1] transition-all">Cancel</button>
                      <button className="px-6 py-2 bg-[#16a34a] text-white text-[10px] font-bold tracking-widest uppercase rounded-lg shadow-md shadow-green-600/10 active:scale-95 transition-all">Save Changes</button>
                   </div>
                </div>

                <div className="space-y-8">
                   {activeSection === "Profile" && (
                    <>
                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">Full Name</label>
                            <input className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium focus:border-[#16a34a] outline-none transition-all" placeholder="Clinician name" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">Electronic Mail</label>
                            <input className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium focus:border-[#16a34a] outline-none transition-all" placeholder="name@clinic.com" />
                         </div>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">Bio / Credentials</label>
                         <textarea className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium h-32 focus:border-[#16a34a] outline-none transition-all resize-none" placeholder="Clinical credentials" />
                      </div>
                    </>
                   )}

                   {activeSection === "Preferences" && (
                    <div className="space-y-10">
                       <div>
                          <p className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase mb-4">Application Theme</p>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 bg-white border-2 border-[#16a34a] rounded-xl flex items-center justify-between">
                                <span className="text-sm font-bold text-[#1e293b]">Clinical Light</span>
                                <CheckCircle2 className="text-[#16a34a]" size={20} />
                             </div>
                             <div className="p-4 bg-[#0c1321] border border-[#1e293b] rounded-xl flex items-center justify-between group cursor-no-drop opacity-50">
                                <span className="text-sm font-bold text-white">Digital Surgeon (Dark)</span>
                                <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-tighter">Pro Mode</p>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center justify-between p-6 bg-white border border-[#E2E8F0] rounded-xl">
                          <div>
                             <p className="text-sm font-bold text-[#1e293b]">High Contrast Data</p>
                             <p className="text-xs font-semibold text-[#94a3b8]">Optimize all tables for JetBrains Mono scanning.</p>
                          </div>
                          <div className="w-12 h-6 bg-[#16a34a] rounded-full relative p-1 flex items-center justify-end">
                             <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                       </div>
                    </div>
                   )}

                   {/* Other sections can be expanded... */}
                </div>
             </motion.div>
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
