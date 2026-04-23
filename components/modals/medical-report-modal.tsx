"use client";

import React from "react";
import { X, Heart, Printer, Download, Mail, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type DiagnosisRecord, type InteractionRecord } from "@/store";
import { type PatientRecord } from "@/store";

interface MedicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord | null;
  diagnoses: DiagnosisRecord[];
  interactions: InteractionRecord[];
  soapNote: { subjective: string; objective: string; assessment: string; plan: string };
  doctorName: string;
  doctorSpecialty?: string;
}

export function MedicalReportModal({
  isOpen,
  onClose,
  patient,
  diagnoses,
  interactions,
  soapNote,
  doctorName,
  doctorSpecialty = "General Practitioner",
}: MedicalReportModalProps) {
  if (!isOpen) return null;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handlePrint = () => {
    const printableReport = document.getElementById("printable-report");
    if (!printableReport) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    const headMarkup = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join("\n");

    const reportTitle = patient?.name
      ? `Medical Report - ${patient.name}`
      : "Medical Report";

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${reportTitle}</title>
          ${headMarkup}
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
            }

            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              font-family: var(--font-dm-sans, "DM Sans", sans-serif);
            }

            .print-report-shell {
              background: #ffffff;
              padding: 32px;
            }

            .print-report-root {
              max-width: 960px;
              margin: 0 auto;
              background: #ffffff;
            }

            @page {
              size: auto;
              margin: 14mm;
            }

            @media print {
              html, body {
                background: #ffffff !important;
              }

              .print-report-shell {
                padding: 0 !important;
              }

              .print-report-root {
                max-width: none !important;
                width: 100% !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-report-shell">
            <div class="print-report-root">
              ${printableReport.innerHTML}
            </div>
          </div>
          <script>
            window.addEventListener("load", function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 300);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          id="printable-report-container"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Action Header (Internal UI) */}
          <div className="flex items-center justify-between px-8 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
            <div className="flex items-center gap-4">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-[#16a34a] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#15803d] transition-all active:scale-95 shadow-md"
              >
                <Printer size={16} /> Print Report
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                <Download size={16} /> PDF
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Report Content */}
          <div className="flex-1 overflow-y-auto p-12 md:p-16 custom-scrollbar print:p-0 print:overflow-visible bg-white" id="printable-report">
            
            {/* Branding Header */}
            <div className="flex flex-col items-center text-center mb-12">
              <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#16a34a]/10 rounded-full scale-150 blur-xl opacity-50" />
                <Heart size={48} className="text-[#16a34a] relative z-10" strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl font-serif font-bold text-slate-800 tracking-tight mb-1">
                Evergreen Wellness Hospital
              </h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.2em] mb-4">
                123 Harmony Street Sunnyville, CA 90210 USA
              </p>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Title */}
            <h2 className="text-4xl font-serif font-black text-center text-slate-900 mb-16 tracking-tighter uppercase">
              Medical Report
            </h2>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              {/* Visit Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#16a34a] uppercase tracking-widest border-b border-emerald-100 pb-2">Visit Info</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Doctor's Name:</span>
                    <span className="text-slate-800 font-bold">{doctorName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Specialization:</span>
                    <span className="text-slate-800 font-bold">{doctorSpecialty}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Visit Date:</span>
                    <span className="text-slate-800 font-bold">{today}</span>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#16a34a] uppercase tracking-widest border-b border-emerald-100 pb-2">Patient Info</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Full Name:</span>
                    <span className="text-slate-800 font-bold">{patient?.name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Birth Date / Age:</span>
                    <span className="text-slate-800 font-bold">{patient?.age ? `${patient.age} years` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Med. Number:</span>
                    <span className="text-slate-800 font-bold font-mono">{patient?.id || "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Gender:</span>
                    <span className="text-slate-800 font-bold capitalize">{patient?.gender || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SOAP: Subjective & Objective */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#16a34a] uppercase tracking-widest border-b border-emerald-100 pb-2">Subjective</h3>
                <div className="text-sm leading-relaxed text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[100px]">
                  {soapNote.subjective || "No subjective findings recorded."}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#16a34a] uppercase tracking-widest border-b border-emerald-100 pb-2">Objective</h3>
                <div className="text-sm leading-relaxed text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[100px]">
                  {soapNote.objective || "No objective findings recorded."}
                </div>
              </div>
            </div>

            {/* SOAP: Assessment & Plan */}
            <div className="mb-12 space-y-4">
              <h3 className="text-sm font-bold text-[#16a34a] uppercase tracking-widest border-b border-emerald-100 pb-2">
                Assessment & Plan
              </h3>
              <div className="text-sm leading-relaxed text-slate-700 italic font-medium bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-[#16a34a] uppercase tracking-widest mb-1">Clinical Assessment</p>
                  <p>{soapNote.assessment || "Clinical assessment pending..."}</p>
                </div>
                {soapNote.plan && (
                  <div className="pt-4 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold text-[#16a34a] uppercase tracking-widest mb-1">Management Plan</p>
                    <p className="not-italic text-slate-600">{soapNote.plan}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnosis Section */}
            <div className="mb-12 space-y-4">
              <h3 className="text-sm font-bold text-[#16a34a] uppercase tracking-widest border-b border-emerald-100 pb-2">
                Differential Diagnosis
              </h3>
              <div className="space-y-3">
                {diagnoses.length > 0 ? (
                  diagnoses.slice(0, 3).map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-bold font-mono">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{d.diagnosis_name || d.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">{d.icd11_code || d.code || "ICD-11: N/A"}</p>
                        </div>
                      </div>
                      <span className="text-emerald-600 font-serif font-black text-lg">
                        {Math.round((d.probability_score || d.prob || 0) * 100)}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">No diagnostic data generated.</p>
                )}
              </div>
            </div>

            {/* Prescription & Safety Section */}
            <div className="mb-16 space-y-4">
              <h3 className="text-sm font-bold text-[#16a34a] uppercase tracking-widest border-b border-emerald-100 pb-2">
                Prescription & Drug Safety
              </h3>
              <div className="space-y-4">
                {interactions.length > 0 ? (
                  interactions.map((interaction, i) => (
                    <div key={i} className="p-5 bg-amber-50/30 border border-amber-100 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                          {[interaction.drug_a, interaction.drug_b].filter(Boolean).join(" + ")}
                        </p>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-tighter">
                          {interaction.severity || "Warning"}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/70 font-medium leading-relaxed mb-2">
                        {interaction.mechanism}
                      </p>
                      {interaction.alternative_suggested && (
                        <div className="text-[10px] text-[#16a34a] font-bold italic">
                          Suggested: {interaction.alternative_suggested}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-center">
                    <p className="text-sm text-emerald-800/60 font-medium italic">
                      "No major clinical contraindications detected in the current medication profile."
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Branding */}
            <div className="mt-32 pt-8 border-t border-slate-100 text-center space-y-4">
              <p className="text-[10px] font-medium text-slate-400 leading-relaxed max-w-lg mx-auto italic">
                For inquiries and appointments, feel free to contact us. 
                This report is generated by MedCoPilot AI Assistant and should be reviewed by a certified medical professional before clinical execution.
              </p>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  www.EvergreenWellnessHospital.com
                </p>
                <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><Mail size={12} className="text-[#16a34a]" /> info@EvergreenWellnessHospital.com</span>
                  <span className="flex items-center gap-1.5"><Share2 size={12} className="text-[#16a34a]" /> Sunnyville Center, CA 90210</span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>

      {/* Local scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </AnimatePresence>
  );
}
