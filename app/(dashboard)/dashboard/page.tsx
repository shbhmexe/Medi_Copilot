"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Search, 
  AlertCircle,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DoctorNotificationBell } from "@/components/doctor/notification-bell";
import { PatientDashboardShell } from "@/components/patient-portal/dashboard-shell";
import { filterPatientsForClinician, isPatientRole } from "@/lib/roles";
import { AddPatientModal, OnboardingSuccessPayload } from "@/components/modals/add-patient-modal";
import { useAuthStore, usePatientStore } from "@/store";
import { buildQueueClinicalSummary } from "@/lib/clinical-display";
import { buildPatientRecordFromOnboarding } from "@/lib/onboarding";

type LiveActivityItem = {
  id: string;
  msg: string;
  time: string;
  color: string;
};

const LIVE_ACTIVITY: LiveActivityItem[] = [];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState("ALL");
  const { patients, addPatient, removePatient, updatePatient } = usePatientStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (isPatientRole(user?.role)) {
    return <PatientDashboardShell />;
  }

  // We map the unified PatientRecord to match Dashboard requirements
  const queueData = filterPatientsForClinician(patients, user);

  const filteredQueueData = queueData.filter((patient) => {
    if (filter === "ALL") return true;
    return patient.status.includes(filter);
  });
  const filterTabs = [
    { key: "ALL", label: `ALL (${queueData.length})` },
    { key: "WAITING", label: `WAITING (${queueData.filter((p) => p.status.includes("WAITING")).length})` },
    { key: "URGENT", label: `URGENT (${queueData.filter((p) => p.status.includes("URGENT")).length})` },
  ];

  const handleOnboardingSuccess = (payload: OnboardingSuccessPayload) => {
    const existingPatient = patients.find((patient) => patient.id === payload.patientId);
    const nextPatient = buildPatientRecordFromOnboarding(payload, existingPatient);

    if (existingPatient) {
      updatePatient(payload.patientId, nextPatient);
    } else {
      addPatient(nextPatient);
    }
    setIsAddModalOpen(false);
    toast.success("Patient successfully onboarded to queue");
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Navigation Bar */}
      <header className="h-16 px-8 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-8">
           <div className="flex flex-col">
              <h1 className="text-xl font-bold font-serif text-[#1e293b]">MedCoPilot</h1>
           </div>
           <div className="h-8 w-px bg-[#E2E8F0]" />
           <div className="flex gap-6">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">Active Patient</p>
                <p className="text-xs font-bold text-[#64748b]">No active patient</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">Allergies</p>
                <p className="text-xs font-bold text-[#1e293b]">No patient selected</p>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
            <input 
              type="text" 
              placeholder="Search Patients or All Insights..." 
              className="bg-[#F1F5F9] border-none rounded-lg pl-10 pr-4 py-2 text-xs w-80 focus:ring-1 focus:ring-[#16a34a] transition-all"
            />
          </div>
          <DoctorNotificationBell />
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center border border-[#E2E8F0]">
                <Users size={16} className="text-[#64748b]" />
             </div>
             <div className="flex flex-col">
               <span className="text-xs font-bold text-[#1e293b]">{user?.name || "Clinician"}</span>
               <span className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">
                 {user?.specialty || (user?.role === "admin" ? "Clinic Admin" : "Doctor")}
               </span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left/Middle Content - Queue */}
        <div className="flex-1 overflow-y-auto px-10 py-10 scrollbar-hide relative">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h2 className="text-4xl font-bold font-serif text-[#1a2e35] mb-1">Today&rsquo;s Queue</h2>
                  <p className="text-sm font-bold text-[#94a3b8]">
                    {filteredQueueData.length} visible from {queueData.length} total patients
                  </p>
               </div>
               <button onClick={() => setIsAddModalOpen(true)} className="bg-[#16a34a] hover:bg-[#15803d] text-white px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase shadow-md shadow-green-600/15 transition-all active:scale-95">
                 Add Patient
               </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 mb-8">
               {filterTabs.map((t) => (
                  <button 
                    key={t.key}
                    onClick={() => setFilter(t.key)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all border ${
                      filter === t.key 
                        ? "bg-[#f1fdf4] border-[#16a34a] text-[#16a34a]" 
                        : "bg-white border-[#E2E8F0] text-[#94a3b8] hover:border-[#CBD5E1]"
                    }`}
                  >
                    {t.label}
                  </button>
               ))}
            </div>

            {/* Patient Cards List */}
            <div className="space-y-4 mb-24">
              {filteredQueueData.map((p, i) => {
                const clinicalSummary = buildQueueClinicalSummary(p);

                return (
                <Link key={p.id} href={`/consultation/${p.id}`}>
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group relative bg-white border ${p.isUrgent ? 'border-[#ca8a04]' : 'border-[#E2E8F0]'} rounded-xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer mb-4`}
                  >
                    {p.isUrgent && (
                      <div className="absolute top-0 right-0 p-2">
                         <AlertCircle size={14} className="text-[#ca8a04] animate-pulse" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-[#16a34a] transition-all">
                         <span className="text-2xl font-bold font-serif text-[#1a2e35]">{p.initials}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-bold text-[#1a2e35] font-serif group-hover:text-[#16a34a] transition-colors">{p.name}</h3>
                              <div className="text-[10px] font-bold text-[#94a3b8] tracking-widest uppercase">
                                 Age: {p.age} • ID: #{p.id} • {p.isUrgent ? <span className="text-[#ca8a04]">URGENT</span> : `WAIT: ${p.wait}`}
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                             {p.assignedDoctorName ? (
                               <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe]">
                                 {p.assignedDoctorName}
                               </div>
                             ) : null}
                             <div className={`px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]`}>
                                {p.status}
                             </div>
                             <button 
                               onClick={async (e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 if (!confirm(`Are you sure you want to delete patient ${p.id}? This will remove them from the database.`)) return;
                                 toast.loading(`Deleting ${p.id}...`, { id: `delete-${p.id}` });
                                 try {
                                   const res = await fetch(`/api/ai/patient/${p.id}`, { method: "DELETE" });
                                   if (!res.ok) throw new Error();
                                   removePatient(p.id);
                                   toast.success(`Patient ${p.id} deleted successfully.`, { id: `delete-${p.id}` });
                                 } catch (err) {
                                   toast.error(`Failed to delete patient ${p.id}.`, { id: `delete-${p.id}` });
                                 }
                               }}
                               className="p-1.5 rounded-md border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                        </div>

                        <p className="text-sm font-semibold italic text-[#64748b] leading-relaxed mb-4">
                           <span className="not-italic text-[10px] font-bold tracking-widest text-[#16a34a] uppercase mr-2">
                             {clinicalSummary.label}:
                           </span>
                           &ldquo;{clinicalSummary.text}&rdquo;
                        </p>

                        <div className="flex gap-2">
                           <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#64748b] text-[9px] font-bold font-mono rounded tracking-tighter uppercase whitespace-nowrap">
                               NEW
                           </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
                );
              })}
              {filteredQueueData.length === 0 && (
                <div className="bg-slate-50 border-2 border-dashed border-[#E2E8F0] rounded-xl p-12 text-center">
                  <p className="text-lg font-bold font-serif text-[#1e293b] mb-2">No patients in this queue yet</p>
                  <p className="text-sm font-semibold text-[#94a3b8]">
                    Add a real patient from ingestion to populate this list.
                  </p>
                </div>
              )}
            </div>
          </div>


        </div>

        {/* Right Panel - Live Activity */}
        <aside className="w-80 h-full border-l border-[#E2E8F0] bg-white flex flex-col p-8 overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-bold font-serif text-[#1a2e35]">Live Activity</h3>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase mb-8">Real-time Stream</p>

          <div className="space-y-10 relative">
             <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-[#F1F5F9]" />
             {LIVE_ACTIVITY.map((item, i) => (
               <motion.div 
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.5 + i * 0.1 }}
                 key={item.id} 
                 className="relative pl-8"
               >
                 <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-4 border-white ${item.color} shadow-sm z-10`} />
                 <p className="text-xs font-bold text-[#1e293b] leading-relaxed mb-1">
                   {item.msg}
                 </p>
                 <p className="text-[10px] font-bold text-[#94a3b8]">{item.time}</p>
               </motion.div>
             ))}
             {LIVE_ACTIVITY.length === 0 && (
               <div className="relative pl-8">
                 <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-4 border-white bg-slate-300 shadow-sm z-10" />
                 <p className="text-xs font-bold text-[#64748b] leading-relaxed mb-1">
                   No live activity yet.
                 </p>
                 <p className="text-[10px] font-bold text-[#94a3b8]">Real events will appear here.</p>
               </div>
             )}
          </div>

          <div className="mt-auto pt-10">
             <div className="p-4 bg-[#F1FDF4] border border-[#dcfce7] rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-[#16a34a] rounded-full animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-[#16a34a] uppercase">System Monitoring Active</span>
             </div>
          </div>
        </aside>
      </div>
      
      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
}
