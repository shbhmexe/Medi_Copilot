"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  ChevronRight, 
  MoreVertical,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AddPatientModal, OnboardingSuccessPayload } from "@/components/modals/add-patient-modal";
import { usePatientStore, PatientRecord } from "@/store";
import { buildPatientRecordFromOnboarding } from "@/lib/onboarding";

type PatientCard = {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit?: string;
  status: string;
  condition?: string;
};

const PATIENTS: PatientCard[] = [];

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { patients, addPatient, updatePatient } = usePatientStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredPatients = patients.filter((patient) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return [patient.name, patient.id, patient.complaint, patient.status]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  const handleOnboardingSuccess = (payload: OnboardingSuccessPayload) => {
    const existingPatient = patients.find((patient) => patient.id === payload.patientId);
    const nextPatient: PatientRecord = {
      ...buildPatientRecordFromOnboarding(payload, existingPatient),
      status: existingPatient?.status || "Active",
    };

    if (existingPatient) {
      updatePatient(payload.patientId, nextPatient);
    } else {
      addPatient(nextPatient);
    }
    setIsAddModalOpen(false);
    toast.success("Patient successfully added to records");
  };

  return (
    <div className="p-10 max-w-7xl mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-bold font-serif text-[#1e293b] mb-2">Patients</h1>
          <p className="text-sm font-bold text-[#94a3b8]">Manage and view all patient clinical records</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-white border border-[#E2E8F0] px-6 py-2.5 rounded-lg text-xs font-bold text-[#64748b] flex items-center gap-2 hover:border-[#16a34a] transition-all">
            <Filter size={16} /> Filters
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-[#16a34a] hover:bg-[#15803d] text-white px-8 py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase shadow-lg shadow-green-600/20 active:scale-95 transition-all flex items-center gap-2">
            <UserPlus size={18} /> New Patient
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="mb-10 flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or condition..." 
            className="w-full bg-[#f8fafb] border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-4 text-sm focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((p, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={p.id}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-[#F1FDF4] rounded-xl flex items-center justify-center text-[#16a34a] font-serif text-xl font-bold group-hover:bg-[#16a34a] group-hover:text-white transition-all">
                 {p.name.charAt(0)}
              </div>
              <button className="text-[#94a3b8] hover:text-[#1e293b]"><MoreVertical size={20} /></button>
            </div>

            <Link href={`/patients/${p.id}`}>
              <h3 className="text-xl font-bold text-[#1e293b] font-serif mb-1 group-hover:text-[#16a34a] transition-colors">{p.name}</h3>
            </Link>
            <p className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase mb-4">{p.gender} • {p.age} Years • ID: #{p.id.padStart(4, '0')}</p>

            <div className="space-y-3 pt-6 border-t border-[#F1F5F9]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94a3b8] font-bold uppercase tracking-widest text-[9px]">Condition</span>
                <span className="text-[#1e293b] font-bold truncate max-w-[150px]">{p.complaint || "Not recorded"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94a3b8] font-bold uppercase tracking-widest text-[9px]">Wait Time</span>
                <span className="text-[#1e293b] font-bold">{p.wait || "Not recorded"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94a3b8] font-bold uppercase tracking-widest text-[9px]">Status</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                  p.status.toLowerCase() === 'active' || p.status.toLowerCase() == 'waiting' ? 'bg-[#f1fdf4] text-[#16a34a] border-[#dcfce7]' :
                  p.status === 'Critical' ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]' :
                  'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  {p.status}
                </span>
              </div>
            </div>

            <Link href={`/patients/${p.id}`} className="mt-6 flex items-center justify-center gap-2 py-2.5 w-full bg-[#f8fafb] hover:bg-[#16a34a] hover:text-white text-[#64748b] text-[10px] font-bold tracking-[0.2em] uppercase rounded-lg transition-all">
              View Profile <ChevronRight size={14} />
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="mt-8 text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <UserPlus className="mx-auto text-[#94a3b8] mb-4" size={48} />
          <p className="text-lg font-bold text-[#64748b] font-serif">No patient records found</p>
          <p className="text-sm font-semibold text-[#94a3b8] mt-2">
            Real patient profiles will appear here after they are saved through the patient API.
          </p>
        </div>
      )}

      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
}
