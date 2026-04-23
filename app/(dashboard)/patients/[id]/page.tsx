"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, User, Phone, Edit, Calendar, Clock, Activity, FileText, Pill, AlertTriangle, Plus } from "lucide-react";
import LabReportUploader from "@/components/LabReportUploader";
import type { Diagnosis, Medication, Patient, Visit } from "@/types";

type VisitWithDetails = Visit & {
  diagnoses?: Diagnosis[];
  medications?: Medication[];
};

export default function PatientDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: patientData, isLoading: patientLoading, isError: patientError } = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) throw new Error("Failed to fetch patient");
      return (await res.json()).data;
    },
    retry: false
  });

  const { data: visitsData } = useQuery<VisitWithDetails[]>({
    queryKey: ["patient-visits", id],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${id}/visits`);
      if (!res.ok) throw new Error("Failed to fetch visits");
      return (await res.json()).data;
    },
    enabled: !!id,
    retry: false
  });

  const patient = patientData;
  const visits = visitsData || [];
  const latestDiagnoses = visits
    .flatMap((visit) => visit.diagnoses || [])
    .filter((diagnosis) => diagnosis.is_primary)
    .slice(0, 3);
  const latestMedications = visits
    .flatMap((visit) => visit.medications || [])
    .slice(0, 4);

  const handleCreateVisit = async () => {
    try {
      const res = await fetch(`/api/patients/${id}/visits`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chief_complaint: "Follow-up consultation" })
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/consultation/${data.data.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (patientLoading) return <div className="p-8 text-medcopilot-text-muted">Loading patient details...</div>;
  if (patientError || !patient) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/patients" className="inline-flex items-center gap-2 text-sm text-medcopilot-text-muted hover:text-medcopilot-cyan transition-colors mb-6">
          <ArrowLeft size={16} /> Back to Patients
        </Link>
        <div className="card-medcopilot text-center py-16">
          <User size={40} className="mx-auto text-medcopilot-text-muted mb-4" />
          <h1 className="text-2xl font-bold text-medcopilot-text-primary mb-2" style={{ fontFamily: "Playfair Display,serif" }}>
            Patient record not found
          </h1>
          <p className="text-sm text-medcopilot-text-muted">
            This page only shows records returned by the patient API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link href="/patients" className="inline-flex items-center gap-2 text-sm text-medcopilot-text-muted hover:text-medcopilot-cyan transition-colors">
        <ArrowLeft size={16} /> Back to Patients
      </Link>

      {/* Profile Header */}
      <div className="card-medcopilot relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <User size={32} className="text-emerald-400" />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-medcopilot-text-primary" style={{fontFamily:'Playfair Display,serif'}}>{patient.name}</h1>
              {patient.blood_group && (
                <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-mono text-sm font-bold">
                  {patient.blood_group}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-medcopilot-text-muted">
              <span className="capitalize">{patient.age} years • {patient.gender}</span>
              <div className="flex items-center gap-1.5"><Phone size={14}/> {patient.phone || "No phone recorded"}</div>
              <div className="flex items-center gap-1.5"><Calendar size={14}/> Reg: {patient.created_at ? format(new Date(patient.created_at), 'MMM d, yyyy') : "Not recorded"}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button onClick={handleCreateVisit} className="btn-primary flex items-center justify-center gap-2">
              <Plus size={16} /> Start Consultation
            </button>
            <button className="px-4 py-2 bg-white/5 border border-medcopilot-border-subtle hover:bg-white/10 rounded-lg text-sm text-medcopilot-text-primary transition-all flex items-center justify-center gap-2">
              <Edit size={16} /> Edit Profile
            </button>
          </div>
        </div>

        {/* Allergies Banner */}
        {patient.allergies?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-medcopilot-border-subtle">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-medcopilot-text-muted flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-400"/> Known Allergies:</span>
              {patient.allergies.map((allergy: string) => (
                <span key={allergy} className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded font-medium">
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Medical Summary */}
        <div className="space-y-6">
          <div className="card-medcopilot">
            <h3 className="text-lg font-semibold text-medcopilot-text-primary mb-4 flex items-center gap-2 border-b border-medcopilot-border-subtle pb-2">
              <Activity size={18} className="text-medcopilot-cyan" /> Quick Overview
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-medcopilot-text-muted uppercase tracking-widest mb-1.5">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {latestDiagnoses.length > 0 ? (
                    latestDiagnoses.map((diagnosis) => (
                      <span key={diagnosis.id || diagnosis.diagnosis_name} className="px-2 py-1 bg-white/5 border border-medcopilot-border-subtle rounded text-sm text-medcopilot-text-primary">
                        {diagnosis.diagnosis_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-medcopilot-text-muted">No conditions recorded.</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-medcopilot-text-muted uppercase tracking-widest mb-1.5">Current Medications</p>
                <div className="space-y-2">
                  {latestMedications.length > 0 ? (
                    latestMedications.map((medication) => (
                      <div key={medication.id || medication.drug_name} className="flex items-center gap-2 text-sm bg-white/5 border border-medcopilot-border-subtle p-2 rounded">
                        <Pill size={14} className="text-medcopilot-cyan" />
                        <span className="text-medcopilot-text-primary">{medication.drug_name}</span>
                        <span className="text-medcopilot-text-muted ml-auto text-xs">
                          {[medication.dosage, medication.frequency].filter(Boolean).join(", ") || "Dose not recorded"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-medcopilot-text-muted">No current medications recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <LabReportUploader patientId={patient.id} />

        {/* Right Col: Visit History */}
        <div className="lg:col-span-2">
          <div className="card-medcopilot h-full">
            <div className="flex items-center justify-between mb-6 border-b border-medcopilot-border-subtle pb-3">
              <h3 className="text-lg font-semibold text-medcopilot-text-primary flex items-center gap-2">
                <Clock size={18} className="text-emerald-400" /> Consultation History
              </h3>
              <span className="text-sm text-medcopilot-text-muted">{visits.length} records found</span>
            </div>

            <div className="space-y-4">
              {visits.length === 0 ? (
                <p className="text-medcopilot-text-muted text-center py-8">No past visits recorded.</p>
              ) : (
                visits.map((visit) => {
                  const primaryDiag = visit.diagnoses?.find((diagnosis) => diagnosis.is_primary) || visit.diagnoses?.[0];
                  return (
                    <div key={visit.id} className="relative pl-6 pb-6 border-l-2 border-medcopilot-border-subtle last:border-0 last:pb-0 group">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-medcopilot-navy-card border-2 border-emerald-500 group-hover:bg-emerald-500 transition-colors" />
                      
                      <div className="bg-white/[0.02] border border-medcopilot-border-subtle rounded-xl p-4 hover:border-medcopilot-cyan/40 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-mono text-emerald-400 mb-1">
                            {format(new Date(visit.created_at), 'MMMM d, yyyy - HH:mm')}
                          </div>
                          <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-semibold ${visit.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {visit.status}
                          </span>
                        </div>
                        
                        <p className="text-base font-medium text-medcopilot-text-primary mb-2 line-clamp-2">
                          &ldquo;{visit.chief_complaint || "No chief complaint recorded"}&rdquo;
                        </p>
                        
                        {primaryDiag && (
                          <div className="mt-3 p-2 bg-white/5 rounded border border-white/5 flex items-center gap-2">
                            <Activity size={14} className="text-medcopilot-cyan" />
                            <span className="text-sm text-medcopilot-text-secondary">
                              Diagnosed: <span className="text-medcopilot-text-primary font-medium">{primaryDiag.diagnosis_name}</span>
                            </span>
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <button onClick={() => router.push(`/consultation/${visit.id}`)} className="text-xs px-3 py-1.5 bg-medcopilot-navy border border-medcopilot-cyan/30 text-medcopilot-cyan rounded hover:bg-medcopilot-cyan/10 transition-colors">
                            View Details
                          </button>
                          {visit.status === 'completed' && (
                            <button className="text-xs px-3 py-1.5 bg-medcopilot-navy border border-medcopilot-border-subtle text-medcopilot-text-secondary rounded hover:text-white transition-colors flex items-center gap-1">
                              <FileText size={12} /> Export SOAP
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
