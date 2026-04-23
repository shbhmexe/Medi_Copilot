"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  AlertCircle, 
  Search, 
  MoreVertical,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AddPatientModal } from "@/components/modals/add-patient-modal";
import { useAuthStore, usePatientStore, PatientRecord } from "@/store";
import { buildQueueClinicalSummary } from "@/lib/clinical-display";
import { buildPatientRecordFromOnboarding } from "@/lib/onboarding";
import { filterPatientsForClinician } from "@/lib/roles";


export default function QueuePage() {
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { user } = useAuthStore();
  
  const { patients, addPatient, updatePatient } = usePatientStore();
  const queueData = filterPatientsForClinician(patients, user);

  const filteredData = queueData.filter(p => {
    if (filter !== "ALL" && !p.status.includes(filter)) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-10 max-w-6xl mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold font-serif text-[#1a2e35] mb-2">Today&rsquo;s Queue</h1>
          <p className="text-sm font-bold text-[#94a3b8]">Clinical patient flow and priority management</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#16a34a] hover:bg-[#15803d] text-white px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center gap-2 shadow-lg shadow-green-600/20 active:scale-95 transition-all"
        >
          <UserPlus size={16} /> Add Patient
        </button>
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(payload) => {
          const existingPatient = patients.find((patient) => patient.id === payload.patientId);
          const nextPatient: PatientRecord = {
            ...buildPatientRecordFromOnboarding(payload, existingPatient),
            status: "WAITING",
          };

          if (existingPatient) {
            updatePatient(payload.patientId, nextPatient);
          } else {
            addPatient(nextPatient);
          }
          setFilter("ALL");
          setSearchQuery("");
          setIsAddModalOpen(false);
          toast.success("Patient successfully onboarded to queue");
        }}
      />

      <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
        <div className="flex gap-3">
          {["ALL", "WAITING", "URGENT"].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${
                filter === f 
                  ? "bg-[#16a34a] border-[#16a34a] text-white" 
                  : "bg-white border-[#E2E8F0] text-[#94a3b8] hover:border-[#16a34a]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
          <input 
            type="text" 
            placeholder="Search queue..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f8fafc] border-2 border-[#f1f5f9] focus:border-[#16a34a] focus:bg-white rounded-xl pl-12 pr-4 py-3 text-sm transition-all outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredData.map((p, i) => {
            const clinicalSummary = buildQueueClinicalSummary(p);

            return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white border-2 ${p.isUrgent ? 'border-[#ca8a04]/50 hover:border-[#ca8a04]' : 'border-[#f1f5f9] hover:border-[#16a34a]/30'} p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group`}
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 bg-white border-2 border-[#f1f5f9] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:border-[#16a34a] transition-all">
                  <span className="text-xl font-bold font-serif text-[#1e293b]">{p.initials}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <Link href={`/consultation/${p.id}`} className="text-2xl font-bold text-[#1e293b] font-serif hover:text-[#16a34a] transition-colors">
                        {p.name}
                      </Link>
                      <span className="px-2 py-1 bg-slate-100 text-[#64748b] text-[9px] font-bold rounded">ID: #{p.id}</span>
                      {p.assignedDoctorName ? (
                        <span className="px-2 py-1 bg-blue-50 text-[#2563eb] text-[9px] font-bold rounded border border-blue-100">
                          {p.assignedDoctorName}
                        </span>
                      ) : null}
                    </div>
                    <div className={`px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]`}>
                      {p.status}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-[#94a3b8] text-xs font-bold uppercase tracking-wide">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-[#16a34a]" />
                      {p.isUrgent ? `URGENT` : `Wait Time: ${p.wait}`}
                    </div>
                    <span>Age: {p.age}</span>
                    <span className="text-[#16a34a] truncate max-w-sm italic">
                      <span className="not-italic uppercase tracking-widest text-[10px]">
                        {clinicalSummary.label}:
                      </span>{" "}
                      &ldquo;{clinicalSummary.text}&rdquo;
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <Link 
                     href={`/consultation/${p.id}`}
                     className="px-6 py-3 bg-[#f1fdf4] text-[#16a34a] text-xs font-bold tracking-widest uppercase rounded-xl hover:bg-[#16a34a] hover:text-white transition-all active:scale-95"
                   >
                     Resume
                   </Link>
                   <button className="p-3 text-[#94a3b8] hover:bg-slate-50 rounded-xl transition-all">
                      <MoreVertical size={20} />
                   </button>
                </div>
              </div>
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
           <AlertCircle className="mx-auto text-[#94a3b8] mb-4" size={48} />
           <p className="text-lg font-bold text-[#64748b] font-serif">No patients found in this filter</p>
        </div>
      )}
    </div>
  );
}
