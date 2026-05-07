"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Clock,
  Brain,
  Zap,
  Bell,
  Users,
  Loader2,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useAuthStore, useConsultationStore, usePatientStore, type InteractionRecord, type PatientRecord } from "@/store";
import ReportAnalyzer from "@/components/ReportAnalyzer";
import { buildQueueClinicalSummary } from "@/lib/clinical-display";
import { runAuthorizedRequest } from "@/lib/client-auth";
import { buildPatientInitials } from "@/lib/onboarding";
import {
  getXrayDisplayFindings,
  getXraySummaryLabel,
  getXrayToneClasses,
} from "@/lib/xray-display";
import type { DoctorPassRecord } from "@/lib/patient-portal";
import { MedicalReportModal } from "@/components/modals/medical-report-modal";

type VitalCardProps = {
  label: string;
  value: string;
  unit: string;
  colorClass?: string;
};

type DiagnosisCardData = {
  name?: string;
  diagnosis_name?: string;
  code?: string;
  icd11_code?: string;
  prob?: number;
  probability_score?: number;
  tags?: string[];
  reasoning?: string;
};

const SOAP_FIELDS = ["subjective", "objective", "assessment", "plan"] as const;

type SavedOnboardingPayload = {
  patientId?: string;
  name?: string;
  age?: number;
  sex?: string;
  summary?: string;
  rawText?: string;
  clinicalFields?: PatientRecord["clinicalFields"];
  modelResult?: PatientRecord["modelResult"];
  xrayResult?: any;
  analysisInput?: string;
  xrayImageBase64?: string | null;
};

type ConsultationDoctorRequest = {
  id: string;
  patientCode: string;
  patientRecord: PatientRecord;
  status: "pending" | "added";
  isRead: boolean;
};

function compactTextParts(parts: Array<string | undefined | null>, separator = " ") {
  return parts.map((part) => (part || "").trim()).filter(Boolean).join(separator);
}

function buildSavedPayloadFromPatientPass(patientPass: DoctorPassRecord): SavedOnboardingPayload {
  const medicalHistory = compactTextParts([
    patientPass.history?.pastHistory && `Past history: ${patientPass.history.pastHistory}`,
    patientPass.history?.chronicConditions && `Chronic conditions: ${patientPass.history.chronicConditions}`,
    patientPass.history?.surgicalHistory && `Surgical history: ${patientPass.history.surgicalHistory}`,
    patientPass.history?.familyHistory && `Family history: ${patientPass.history.familyHistory}`,
    patientPass.history?.lifestyleNotes && `Lifestyle: ${patientPass.history.lifestyleNotes}`,
  ]);

  const chiefComplaint = compactTextParts(
    [
      patientPass.booking?.reason,
      patientPass.booking?.symptoms,
      patientPass.history?.currentSymptoms,
    ],
    ". "
  );

  const rawText = compactTextParts(
    [
      `Patient code: ${patientPass.patientCode}`,
      patientPass.patient.fullName && `Name: ${patientPass.patient.fullName}`,
      patientPass.patient.age && `Age: ${patientPass.patient.age}`,
      patientPass.patient.gender && `Gender: ${patientPass.patient.gender}`,
      patientPass.booking?.doctorName && `Doctor: ${patientPass.booking.doctorName}`,
      patientPass.booking?.specialty && `Specialty: ${patientPass.booking.specialty}`,
      patientPass.booking?.hospitalName && `Hospital: ${patientPass.booking.hospitalName}`,
      patientPass.booking?.appointmentDate &&
      `Appointment date: ${[patientPass.booking.appointmentDate, patientPass.booking.appointmentTime].filter(Boolean).join(" - ")}`,
      chiefComplaint && `Chief complaint: ${chiefComplaint}`,
      medicalHistory && `Medical history: ${medicalHistory}`,
      patientPass.history?.currentMedications && `Current medications: ${patientPass.history.currentMedications}`,
      patientPass.history?.allergies && `Allergies: ${patientPass.history.allergies}`,
    ],
    "\n"
  );

  return {
    patientId: patientPass.patientCode,
    name: patientPass.patient.fullName || "Patient",
    age: Number(patientPass.patient.age) || 0,
    sex: patientPass.patient.gender || "Other",
    summary: chiefComplaint || patientPass.booking?.reason || "Consultation handoff loaded from patient pass.",
    rawText,
    clinicalFields: {
      chief_complaint: chiefComplaint || undefined,
      medical_history: medicalHistory || undefined,
      current_medications: patientPass.history?.currentMedications || undefined,
      vitals: patientPass.vitals || {},
      document_excerpt: rawText || undefined,
    },
    analysisInput: chiefComplaint || medicalHistory || rawText,
  };
}

function buildPatientRecordFromPatientPass(patientPass: DoctorPassRecord): PatientRecord {
  const payload = buildSavedPayloadFromPatientPass(patientPass);
  const complaint = buildQueueClinicalSummary({
    complaint: payload.summary,
    rawText: payload.rawText,
    clinicalFields: payload.clinicalFields,
    modelResult: null,
  }).text;

  return {
    id: patientPass.patientCode,
    initials: buildPatientInitials(patientPass.patient.fullName || "Patient"),
    clinicId: undefined,
    name: patientPass.patient.fullName || "Patient",
    age: Number(patientPass.patient.age) || 0,
    gender: patientPass.patient.gender || "Other",
    complaint,
    status: "WAITING",
    isUrgent: /urgent|emergency|severe|critical/i.test(
      `${patientPass.booking?.reason || ""} ${patientPass.booking?.symptoms || ""}`
    ),
    wait: [patientPass.booking?.appointmentDate, patientPass.booking?.appointmentTime].filter(Boolean).join(" - ") || "Scheduled",
    rawText: payload.rawText,
    clinicalFields: payload.clinicalFields,
    assignedDoctorId: patientPass.booking?.doctorId,
    assignedDoctorName: patientPass.booking?.doctorName,
    assignedDoctorSpecialty: patientPass.booking?.specialty,
    assignedDoctorEmail: patientPass.booking?.doctorEmail,
    bookingId: patientPass.booking?.appointmentId,
    appointmentDate: patientPass.booking?.appointmentDate,
    appointmentTime: patientPass.booking?.appointmentTime,
    modelResult: null,
    xrayResult: null,
  };
}

function mergeSavedOnboardingPayloads(
  cachedPayload: SavedOnboardingPayload | null,
  storePayload: SavedOnboardingPayload | null
): SavedOnboardingPayload | null {
  if (!cachedPayload && !storePayload) return null;

  return {
    ...(storePayload || {}),
    ...(cachedPayload || {}),
    clinicalFields: {
      ...(storePayload?.clinicalFields || {}),
      ...(cachedPayload?.clinicalFields || {}),
      vitals: {
        ...(storePayload?.clinicalFields?.vitals || {}),
        ...(cachedPayload?.clinicalFields?.vitals || {}),
      },
    },
    modelResult:
      cachedPayload?.modelResult ||
      storePayload?.modelResult ||
      null,
    xrayResult:
      cachedPayload?.xrayResult ||
      storePayload?.xrayResult ||
      null,
    rawText:
      cachedPayload?.rawText ||
      storePayload?.rawText ||
      "",
    summary:
      cachedPayload?.summary ||
      storePayload?.summary ||
      "",
  };
}

type DocumentSection = {
  label: string;
  value: string;
};

type SoapNoteData = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

const DOCUMENT_SECTION_LABELS = [
  "Patient Name",
  "Age",
  "Sex",
  "Report Date",
  "Chief Complaint",
  "Medical History",
  "Current Medications",
  "Allergies",
  "Vitals",
  "Lab Reports",
  "Diagnosis",
  "Doctor Comments",
] as const;

function diagnosisProbability(diagnosis: DiagnosisCardData) {
  if (typeof diagnosis.prob === "number") return diagnosis.prob;
  if (typeof diagnosis.probability_score === "number") {
    return diagnosis.probability_score <= 1
      ? Math.round(diagnosis.probability_score * 100)
      : Math.round(diagnosis.probability_score);
  }
  return 0;
}

function normalizeClinicalSnippet(value?: string) {
  return (value || "")
    .replace(/^["']?\s*OCR extracted text from\s+[^:]+:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDocumentText(value?: string) {
  return (value || "")
    .replace(/^["']?\s*OCR extracted text from\s+[^:]+:\s*/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTechnicalReportText(value?: string) {
  return normalizeDocumentText(value)
    .replace(/\bMedCoPilot\s+Clinical\s+Report\s*\d*\b/gi, "")
    .replace(/\bSynthetic\s+test\s+report\s*-\s*not\s+a\s+real\s+patient\b/gi, "")
    .replace(/\bSAMPLE\s+CLINICAL\s+REPORT\s*\d*\s*-\s*FOR\s+TESTING\s+ONLY\b/gi, "")
    .replace(/\bFOR\s+TESTING\s+OCR\s*\+\s*FIELD\s+EXTRACTION\s+ONLY\s*-\s*NOT\s+A\s+REAL\s+PATIENT\b/gi, "")
    .replace(/\bNot\s+a\s+real\s+patient\s+record\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyWholeDocumentDump(value?: string) {
  const cleaned = normalizeClinicalSnippet(value);
  if (!cleaned) return false;

  const upper = cleaned.toUpperCase();
  const administrativeHits = [
    "DEPARTMENT",
    "DIVISION",
    "TAXATION",
    "REVENUE",
    "MOTOR VEHICLE",
    "APPLICATION",
  ].filter((keyword) => upper.includes(keyword)).length;

  return (
    /^["']?\s*OCR extracted text from/i.test(value || "") ||
    administrativeHits >= 2 ||
    (cleaned.length > 220 && upper.includes("REPORT"))
  );
}

function normalizeClinicalField(value?: string) {
  if (isLikelyWholeDocumentDump(value)) return "";
  return normalizeClinicalSnippet(value)
    .replace(/\s+(Medical History|Current Medications|Allergies|Vitals|Lab Reports|Diagnosis|Doctor Comments)\s*:?.*$/i, "")
    .trim();
}

function buildDocumentSummary(...values: (string | undefined)[]) {
  const documentText =
    values.map((value) => normalizeDocumentText(value)).find(Boolean) || "";

  return stripTechnicalReportText(documentText)
    .replace(/\s+(?=(?:MVD|NEW MEXICO|Please be advised|MEDICAL REPORT|Patient|Diagnosis|History|Medications|Vitals)\b)/g, "\n")
    .trim();
}

function sectionLabelPattern(label: string) {
  return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

function buildDocumentSections(documentText: string): DocumentSection[] {
  const cleanedText = stripTechnicalReportText(documentText);
  if (!cleanedText) return [];

  const sectionPattern = DOCUMENT_SECTION_LABELS.map(sectionLabelPattern).join("|");
  const labelRegex = new RegExp(`\\b(${sectionPattern})\\s*:`, "gi");
  const matches = [...cleanedText.matchAll(labelRegex)];

  if (matches.length === 0) {
    return [{ label: "Extracted Text", value: cleanedText }];
  }

  return matches
    .map((match, index) => {
      const label = match[1].replace(/\s+/g, " ");
      const valueStart = (match.index || 0) + match[0].length;
      const valueEnd =
        index + 1 < matches.length && typeof matches[index + 1].index === "number"
          ? matches[index + 1].index
          : cleanedText.length;
      const value = cleanedText.slice(valueStart, valueEnd).replace(/\s+/g, " ").trim();
      return { label, value };
    })
    .filter((section) => section.value);
}

function getDocumentSectionValue(sections: DocumentSection[], label: string) {
  return sections.find((section) => section.label.toLowerCase() === label.toLowerCase())?.value || "";
}

function parseVitalsFromSection(value: string) {
  const vitals: Record<string, string> = {};
  const patterns = {
    bp: /\bBP\s*:\s*([0-9]{2,3}\s*\/\s*[0-9]{2,3})/i,
    pulse: /\bPulse\s*:\s*([0-9]{2,3})/i,
    temperature: /\b(?:Temp|Temperature)\s*:\s*([0-9]{2,3}(?:\.[0-9]+)?)/i,
    spo2: /\bSpO2\s*:\s*([0-9]{2,3})/i,
    weight: /\bWeight\s*:\s*([0-9]{2,3}(?:\.[0-9]+)?)/i,
    rbs: /\bRBS\s*:\s*([0-9]{2,3}(?:\.[0-9]+)?)/i,
  };

  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = pattern.exec(value);
    if (match?.[1]) {
      vitals[key] = match[1].replace(/\s+/g, "");
    }
  });

  return vitals;
}

function formatVitals(vitals: Record<string, string>) {
  const labels: Record<string, string> = {
    bp: "BP",
    pulse: "Pulse",
    temperature: "Temp",
    spo2: "SpO2",
    weight: "Weight",
    rbs: "RBS",
  };

  return Object.entries(vitals)
    .map(([key, value]) => `${labels[key] || key}: ${value}`)
    .join(", ");
}

function normalizeDiagnosisProbability(diagnosis: DiagnosisCardData) {
  if (typeof diagnosis.probability_score === "number") {
    return diagnosis.probability_score <= 1
      ? Math.round(diagnosis.probability_score * 100)
      : Math.round(diagnosis.probability_score);
  }
  if (typeof diagnosis.prob === "number") return Math.round(diagnosis.prob);
  return 0;
}

function buildFallbackDrugSafety(currentMedications: string): InteractionRecord[] {
  const meds = currentMedications
    .split(/[;,]\s*/)
    .map((medication) => medication.trim())
    .filter(Boolean);

  if (meds.length === 0) {
    return [{
      drug_a: "Medication list",
      drug_b: "Clinical profile",
      severity: "low",
      mechanism: "No current medications were available for pairwise safety review.",
      clinical_significance: "Confirm medication history before prescribing.",
      alternative_suggested: "Add current medications and re-run AI analysis.",
    }];
  }

  return [{
    drug_a: meds[0],
    drug_b: meds[1] || "Clinical profile",
    severity: "low",
    mechanism: "No major interaction was returned by the AI service for the extracted medication profile.",
    clinical_significance: "Continue routine checks for allergy, renal function, dose, contraindications, and duplicate therapy.",
    alternative_suggested: null,
  }];
}

function buildSoapNoteFromWorkflow({
  chiefComplaint,
  medicalHistory,
  currentMedications,
  documentVitals,
  documentSummary,
  diagnoses,
  interactions,
}: {
  chiefComplaint: string;
  medicalHistory: string;
  currentMedications: string;
  documentVitals: Record<string, string>;
  documentSummary: string;
  diagnoses: DiagnosisCardData[];
  interactions: InteractionRecord[];
}): SoapNoteData {
  const vitals = formatVitals(documentVitals) || "Vitals not recorded.";
  const topDiagnoses = diagnoses
    .slice(0, 3)
    .map((diagnosis) => `${diagnosis.diagnosis_name || diagnosis.name || "Diagnosis"} (${normalizeDiagnosisProbability(diagnosis)}%)`)
    .join("; ");
  const safetyNotes = interactions
    .slice(0, 3)
    .map((interaction) => {
      const pair = [interaction.drug_a, interaction.drug_b].filter(Boolean).join(" + ");
      return `${pair || "Medication safety"}: ${interaction.severity || "review"} - ${interaction.clinical_significance || interaction.mechanism || "Review clinically."}`;
    })
    .join(" ");

  return {
    subjective: [
      chiefComplaint && `Chief complaint: ${chiefComplaint}`,
      medicalHistory && `Relevant history: ${medicalHistory}`,
      currentMedications && `Current medications: ${currentMedications}`,
    ].filter(Boolean).join("\n") || "Subjective clinical details not available.",
    objective: [
      `Vitals: ${vitals}`,
      documentSummary && `Document/lab context: ${documentSummary}`,
    ].filter(Boolean).join("\n"),
    assessment: topDiagnoses || "Assessment pending AI differential diagnosis.",
    plan: [
      "Correlate AI output with bedside examination and clinician judgement.",
      safetyNotes && `Drug safety: ${safetyNotes}`,
      "Review red flags, hydration status, relevant labs, and follow-up/return precautions.",
    ].filter(Boolean).join("\n"),
  };
}

function isSoapNoteEmpty(note: SoapNoteData) {
  return SOAP_FIELDS.every((field) => !note[field].trim());
}

function getSeverityClasses(severity?: string) {
  const normalized = severity?.toLowerCase() || "";
  if (["major", "high", "severe"].some((level) => normalized.includes(level))) {
    return "bg-red-50 text-red-700 border-red-100";
  }
  if (["moderate", "medium", "review"].some((level) => normalized.includes(level))) {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }
  return "bg-emerald-50 text-[#16a34a] border-emerald-100";
}

// Components
const VitalCard = ({ label, value, unit, colorClass = "text-[#16a34a]" }: VitalCardProps) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-1 shadow-sm">
    <p className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">{label}</p>
    <div className="flex items-baseline gap-1">
      <span className={`text-xl font-bold font-mono ${colorClass}`}>{value}</span>
      <span className="text-[10px] font-bold text-[#94a3b8]">{unit}</span>
    </div>
  </div>
);

const DiagnosisBox = ({ d }: { d: DiagnosisCardData }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className="bg-white border border-[#E2E8F0] rounded-2xl p-8 mb-6 relative overflow-hidden"
  >
    <div className="flex justify-between items-start mb-6">
      <div className="flex-1">
        <h3 className="text-3xl font-bold font-serif text-[#1e293b] mb-4">{d.name || d.diagnosis_name}</h3>
        <div className="flex gap-2">
          {(d.tags || []).map((t: string) => (
            <span key={t} className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${t === 'URGENT' ? 'bg-[#ca8a04] text-white' : 'bg-[#F1F5F9] text-[#64748b]'
              }`}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase mb-1">
          ICD-11: {d.code || d.icd11_code}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-5xl font-bold text-[#14532d] font-serif leading-none">{diagnosisProbability(d)}%</span>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">Probability</span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-12 gap-8 pt-6 border-t border-[#F1F5F9]">
      <div className="col-span-4">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase mb-4">Confidence Alignment</p>
        <div className="h-1 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#16a34a] transition-all duration-1000"
            style={{ width: `${diagnosisProbability(d)}%` }}
          />
        </div>
      </div>
      <div className="col-span-8">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase mb-4">Clinical Reasoning</p>
        <p className="text-sm font-semibold italic text-[#64748b] leading-[1.6]">
          &ldquo;{d.reasoning || "No reasoning returned."}&rdquo;
        </p>
      </div>
    </div>
  </motion.div>
);

const XrayVerdictSummary = ({ result }: { result: any }) => {
  const tone = getXrayToneClasses(result);
  const findings = getXrayDisplayFindings(result);
  const abnormalFindings = findings.filter((finding) => finding.category !== "normal");

  return (
    <div className="space-y-5 pt-2">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-inner ${tone.icon}`}>
            <Zap size={24} className="opacity-80" />
          </div>
          <div>
            <h3 className={`text-3xl font-bold font-serif mb-1 ${tone.heading}`}>
              {getXraySummaryLabel(result)}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Multi-model radiology summary
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end">
          <span className={`text-4xl font-bold font-serif leading-none ${tone.heading}`}>
            {abnormalFindings.length}
          </span>
          <span className="text-[9px] font-bold tracking-widest uppercase opacity-70 mt-1">
            Displayed Findings
          </span>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {findings.map((finding) => (
            <span
              key={`${finding.source}-${finding.label}`}
              className="rounded-lg bg-white/70 border border-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600"
            >
              {finding.label}
            </span>
          ))}
        </div>
      )}

      {result?.summary_text && (
        <p className="text-sm font-semibold italic text-[#64748b] leading-relaxed">
          {result.summary_text}
        </p>
      )}
    </div>
  );
};

export default function ConsultationPage() {
  const params = useParams<{ visitId: string }>();
  const visitId = params.visitId;
  const { patients, addPatient, updatePatient } = usePatientStore();
  const { accessToken, user, setUser, clearAuth } = useAuthStore();
  const patientFromStore = patients.find((patient) => patient.id === visitId);
  const {
    diagnoses,
    interactions,
    isAnalyzing,
    isGeneratingSoap,
    soapNote,
    workflowLogs,
    engineStability,
    addDiagnosis,
    setInteractions,
    setAnalyzing,
    setGeneratingSoap,
    addWorkflowLog,
    setEngineStability,
    updateSoapField,
    resetAnalysis
  } = useConsultationStore();

  const [activeTab, setActiveTab] = useState("Differential Diagnosis");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [documentVitals, setDocumentVitals] = useState<Record<string, string>>({});
  const [documentSummary, setDocumentSummary] = useState("");
  const [patientDataLabel, setPatientDataLabel] = useState("PATIENT DATA: NOT LOADED");
  const [onboardingModelResult, setOnboardingModelResult] = useState<PatientRecord["modelResult"]>(null);
  const [onboardingXrayResult, setOnboardingXrayResult] = useState<any | null>(null);
  const [savedOnboardingPayload, setSavedOnboardingPayload] = useState<SavedOnboardingPayload | null>(null);
  const [serverPassPayload, setServerPassPayload] = useState<SavedOnboardingPayload | null>(null);
  const [showRecheckAnalyzer, setShowRecheckAnalyzer] = useState(false);
  const [doctorQueueRequest, setDoctorQueueRequest] = useState<ConsultationDoctorRequest | null>(null);
  const [isAddingToPatients, setIsAddingToPatients] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const recoveryAttemptRef = useRef<string>("");
  const documentSections = buildDocumentSections(documentSummary);

  useEffect(() => {
    recoveryAttemptRef.current = "";
  }, [visitId]);

  useEffect(() => {
    if (!visitId) return;

    let cancelled = false;

    const loadPatientPassFallback = async () => {
      try {
        const response = await fetch(`/api/patient-pass?patientCode=${encodeURIComponent(visitId)}`, {
          cache: "no-store",
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; data?: DoctorPassRecord }
          | null;

        if (!response.ok || !payload?.success || !payload.data || cancelled) {
          return;
        }

        const nextSavedPayload = buildSavedPayloadFromPatientPass(payload.data);
        setServerPassPayload(nextSavedPayload);

        try {
          localStorage.setItem(`medcopilot:onboarding:${visitId}`, JSON.stringify(nextSavedPayload));
        } catch (error) {
          console.warn("[Consultation] Could not cache patient-pass fallback payload:", error);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[Consultation] Could not load patient pass fallback:", error);
        }
      }
    };

    void loadPatientPassFallback();

    return () => {
      cancelled = true;
    };
  }, [visitId]);

  useEffect(() => {
    if (!visitId || !user || (user.role !== "doctor" && user.role !== "admin")) {
      setDoctorQueueRequest(null);
      return;
    }

    let cancelled = false;

    const loadDoctorQueueRequest = async () => {
      try {
        const response = await runAuthorizedRequest("/api/doctor-inbox", {
          cache: "no-store",
        }, { accessToken, user, setUser, clearAuth });

        if (!response.ok) {
          throw new Error("Could not load doctor booking request");
        }

        const payload = (await response.json().catch(() => ({}))) as {
          data?: ConsultationDoctorRequest[];
        };

        if (cancelled) return;

        const matchingRequest =
          (payload.data || []).find((item) => item.patientCode === visitId) || null;
        setDoctorQueueRequest(matchingRequest);
      } catch (error) {
        if (!cancelled) {
          console.warn("[Consultation] Could not load doctor booking request:", error);
        }
      }
    };

    void loadDoctorQueueRequest();

    const handleFocus = () => {
      void loadDoctorQueueRequest();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [accessToken, clearAuth, setUser, user, visitId]);

  useEffect(() => {
    let cachedPayload: SavedOnboardingPayload | null = null;

    try {
      const savedPayload = localStorage.getItem(`medcopilot:onboarding:${visitId}`);
      cachedPayload = savedPayload ? (JSON.parse(savedPayload) as SavedOnboardingPayload) : null;
    } catch (error) {
      console.warn("[Consultation] Could not load onboarding payload:", error);
    }

    const storePayload: SavedOnboardingPayload | null = patientFromStore
      ? {
        patientId: patientFromStore.id,
        name: patientFromStore.name,
        age: patientFromStore.age,
        sex: patientFromStore.gender,
        summary: patientFromStore.complaint,
        rawText: patientFromStore.rawText,
        clinicalFields: patientFromStore.clinicalFields,
        modelResult: patientFromStore.modelResult,
        xrayResult: patientFromStore.xrayResult,
      }
      : null;

    const payload = mergeSavedOnboardingPayloads(
      cachedPayload,
      mergeSavedOnboardingPayloads(storePayload, serverPassPayload)
    );
    if (!payload) {
      setPatientDataLabel("PATIENT DATA: NOT LOADED");
      setSavedOnboardingPayload(null);
      return;
    }

    const fields = payload.clinicalFields || {};
    const topModelPrediction = payload.modelResult?.predictions?.[0]?.disease;
    const documentText = buildDocumentSummary(fields.document_excerpt, payload.rawText, payload.summary);
    const documentSections = buildDocumentSections(documentText);
    const sectionVitals = parseVitalsFromSection(getDocumentSectionValue(documentSections, "Vitals"));
    const cleanChiefComplaint = normalizeClinicalField(fields.chief_complaint);
    const cleanMedicalHistory = normalizeClinicalField(fields.medical_history);
    const cleanCurrentMedications = normalizeClinicalField(fields.current_medications);

    setChiefComplaint(
      cleanChiefComplaint ||
      getDocumentSectionValue(documentSections, "Chief Complaint") ||
      (topModelPrediction ? `Model signal: ${topModelPrediction}` : "")
    );
    setMedicalHistory(cleanMedicalHistory || getDocumentSectionValue(documentSections, "Medical History"));
    setCurrentMedications(cleanCurrentMedications || getDocumentSectionValue(documentSections, "Current Medications"));
    setDocumentVitals({ ...sectionVitals, ...(fields.vitals || {}) });
    setDocumentSummary(documentText);
    setOnboardingModelResult(payload.modelResult || null);
    setOnboardingXrayResult(payload.xrayResult || null);
    setSavedOnboardingPayload(payload);
    setPatientDataLabel(
      [
        payload.name,
        payload.age ? `AGE: ${payload.age}` : "",
        payload.sex ? `SEX: ${payload.sex}` : "",
      ].filter(Boolean).join(" / ") || "PATIENT DATA: LOADED"
    );
  }, [patientFromStore, serverPassPayload, visitId]);

  useEffect(() => {
    if (!savedOnboardingPayload || !visitId) return;

    const hasSeededDiagnoses = diagnoses.length > 0;
    const predictions = savedOnboardingPayload.modelResult?.predictions || [];

    if (hasSeededDiagnoses || predictions.length === 0) return;

    resetAnalysis();
    predictions.forEach((prediction) => {
      addDiagnosis({
        diagnosis_name: prediction.disease,
        icd11_code: prediction.icd11_code,
        probability_score: prediction.probability,
        tags: ["ONBOARDING"],
        reasoning: "Seeded from onboarding symptom analysis.",
      });
    });
    setEngineStability(
      Math.max(
        0,
        Math.min(100, Math.round((predictions[0]?.probability || 0) * 100))
      )
    );
    addWorkflowLog({ msg: "Onboarding diagnostic predictions loaded.", type: "ok" });
  }, [addDiagnosis, addWorkflowLog, diagnoses.length, resetAnalysis, savedOnboardingPayload, setEngineStability, visitId]);

  useEffect(() => {
    if (!savedOnboardingPayload || !visitId) return;

    const shouldRecoverModel =
      !(savedOnboardingPayload.modelResult?.predictions?.length) &&
      Boolean(
        savedOnboardingPayload.analysisInput ||
        savedOnboardingPayload.clinicalFields?.chief_complaint ||
        savedOnboardingPayload.rawText ||
        savedOnboardingPayload.summary
      );
    const shouldRecoverXray =
      !savedOnboardingPayload.xrayResult &&
      Boolean(savedOnboardingPayload.xrayImageBase64);

    if (!shouldRecoverModel && !shouldRecoverXray) return;

    const recoveryKey = `${visitId}:${shouldRecoverModel ? "model" : ""}:${shouldRecoverXray ? "xray" : ""}`;
    if (recoveryAttemptRef.current === recoveryKey) return;
    recoveryAttemptRef.current = recoveryKey;

    let cancelled = false;

    const runPredictReport = async (input: string) => {
      const requestBody = JSON.stringify({ mode: "text", input });
      const buildHeaders = (token: string | null) => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });
      const runRequest = (token: string | null) =>
        fetch("/api/predict-report", {
          method: "POST",
          headers: buildHeaders(token),
          credentials: "include",
          body: requestBody,
        });

      let response = await runRequest(accessToken);

      if (response.status === 401 && user) {
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const refreshData = await refreshResponse.json().catch(() => ({}));
        const refreshedToken =
          typeof refreshData?.data?.access_token === "string"
            ? refreshData.data.access_token
            : null;

        if (refreshResponse.ok && refreshedToken) {
          setUser(user, refreshedToken);
          response = await runRequest(refreshedToken);
        }
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        const errorDetail =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.error?.message === "string"
              ? data.error.message
              : `Prediction failed (HTTP ${response.status})`;
        throw new Error(errorDetail);
      }

      return data;
    };

    const recoverDiagnostics = async () => {
      const nextPayload: SavedOnboardingPayload = { ...savedOnboardingPayload };

      try {
        if (shouldRecoverModel) {
          const analysisInput =
            savedOnboardingPayload.analysisInput ||
            savedOnboardingPayload.clinicalFields?.chief_complaint ||
            savedOnboardingPayload.rawText ||
            savedOnboardingPayload.summary ||
            "";

          if (analysisInput.trim()) {
            nextPayload.modelResult = await runPredictReport(analysisInput.trim());
          }
        }

        if (shouldRecoverXray && savedOnboardingPayload.xrayImageBase64) {
          const response = await fetch("/api/predict-xray", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ image: savedOnboardingPayload.xrayImageBase64 }),
          });
          const data = await response.json().catch(() => ({}));

          if (response.ok && data.success) {
            nextPayload.xrayResult = data.data;
          } else {
            throw new Error(
              typeof data?.error === "string"
                ? data.error
                : `X-Ray prediction failed (HTTP ${response.status})`
            );
          }
        }

        if (cancelled) return;

        setSavedOnboardingPayload(nextPayload);
        setOnboardingModelResult(nextPayload.modelResult || null);
        setOnboardingXrayResult(nextPayload.xrayResult || null);

        try {
          localStorage.setItem(`medcopilot:onboarding:${visitId}`, JSON.stringify(nextPayload));
        } catch (error) {
          console.warn("[Consultation] Could not persist recovered onboarding payload:", error);
        }

        updatePatient(visitId, (patient) => ({
          ...patient,
          rawText: nextPayload.rawText || patient.rawText,
          clinicalFields: nextPayload.clinicalFields || patient.clinicalFields,
          modelResult: nextPayload.modelResult || patient.modelResult,
          xrayResult: nextPayload.xrayResult || patient.xrayResult,
        }));

        addWorkflowLog({ msg: "Recovered onboarding diagnostic output.", type: "ok" });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not recover onboarding diagnostics.";
        addWorkflowLog({ msg: message, type: "error" });
      }
    };

    void recoverDiagnostics();

    return () => {
      cancelled = true;
    };
  }, [accessToken, addWorkflowLog, savedOnboardingPayload, setUser, updatePatient, user, visitId]);

  useEffect(() => {
    if (!visitId) return;

    const currentInteractions = interactions.length > 0 ? interactions : buildFallbackDrugSafety(currentMedications);
    const nextSoapNote = buildSoapNoteFromWorkflow({
      chiefComplaint,
      medicalHistory,
      currentMedications,
      documentVitals,
      documentSummary,
      diagnoses,
      interactions: currentInteractions,
    });

    if (interactions.length === 0) {
      setInteractions(currentInteractions);
      addWorkflowLog({ msg: "Drug safety seeded from onboarding record.", type: "ok" });
    }

    if (isSoapNoteEmpty(soapNote)) {
      SOAP_FIELDS.forEach((field) => {
        updateSoapField(field, nextSoapNote[field]);
      });
      addWorkflowLog({ msg: "SOAP note drafted from onboarding record.", type: "ok" });
    }
  }, [
    addWorkflowLog,
    chiefComplaint,
    currentMedications,
    diagnoses,
    documentSummary,
    documentVitals,
    interactions,
    medicalHistory,
    soapNote,
    setInteractions,
    updateSoapField,
    visitId,
  ]);

  const handleRunAnalysis = async () => {
    if (isAnalyzing || isGeneratingSoap) return;

    const clinicalContext = [
      chiefComplaint.trim() && `Chief complaint: ${chiefComplaint.trim()}`,
      medicalHistory.trim() && `Medical history: ${medicalHistory.trim()}`,
      currentMedications.trim() && `Current medications: ${currentMedications.trim()}`,
      Object.keys(documentVitals).length &&
      `Vitals: ${formatVitals(documentVitals)}`,
      documentSummary.trim() && `Extracted document text: ${documentSummary.trim()}`,
    ].filter(Boolean).join("\n");

    if (!clinicalContext) {
      toast.error("Please enter clinical details before running analysis.");
      return;
    }

    resetAnalysis();
    setAnalyzing(true);
    setGeneratingSoap(true);
    toast.info("Running full AI workflow...");
    addWorkflowLog({ msg: "Connecting to AI inference engine...", type: "busy" });
    addWorkflowLog({ msg: "Preparing differential diagnosis, drug safety, and SOAP note...", type: "busy" });

    try {
      const collectedDiagnoses: DiagnosisCardData[] = [];
      let collectedInteractions: InteractionRecord[] = [];

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_id: visitId,
          clinical_context: clinicalContext,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Backend unreachable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let diagCount = 0;
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            if (line.startsWith("event:")) {
              currentEvent = line.replace(/^event:\s*/, "");
              continue;
            }

            if (line.startsWith("data:")) {
              const raw = line.replace(/^data:\s*/, "");
              const payload = JSON.parse(raw);
              const eventType = payload.event || currentEvent;

              if (eventType === "error") {
                throw new Error(payload.message || payload.data?.message || "AI analysis failed");
              }

              if (eventType === "thinking" || payload.message) {
                const msg = payload.message || payload.data?.message || "Processing...";
                addWorkflowLog({ msg, type: "busy" });
              } else if (eventType === "diagnosis_card" || payload.diagnosis_name) {
                const diagnosis = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data || payload;
                addDiagnosis(diagnosis);
                collectedDiagnoses.push(diagnosis);
                const probability =
                  typeof diagnosis.probability_score === "number"
                    ? diagnosis.probability_score <= 1
                      ? diagnosis.probability_score * 100
                      : diagnosis.probability_score
                    : typeof diagnosis.prob === "number"
                      ? diagnosis.prob
                      : 0;
                setEngineStability(Math.max(0, Math.min(100, probability)));
                diagCount++;
              } else if (eventType === "interaction_check") {
                const nextInteractions = Array.isArray(payload.data)
                  ? payload.data
                  : Array.isArray(payload)
                    ? payload
                    : [];
                collectedInteractions = nextInteractions;
                setInteractions(nextInteractions);
                addWorkflowLog({ msg: `Drug safety complete (${nextInteractions.length} note${nextInteractions.length === 1 ? "" : "s"})`, type: "ok" });
              } else if (eventType === "complete") {
                break;
              }
            } else if (line.startsWith("{")) {
              const payload = JSON.parse(line);
              if (payload.diagnosis_name) {
                addDiagnosis(payload);
                collectedDiagnoses.push(payload);
                const probability =
                  typeof payload.probability_score === "number"
                    ? payload.probability_score <= 1
                      ? payload.probability_score * 100
                      : payload.probability_score
                    : 0;
                setEngineStability(Math.max(0, Math.min(100, probability)));
                diagCount++;
              } else if (payload.message) {
                addWorkflowLog({ msg: payload.message, type: "busy" });
              }
            }
          } catch (parseError) {
            if (!(parseError instanceof SyntaxError)) {
              throw parseError;
            }
          }
        }
      }

      if (diagCount === 0) {
        const fallbackDiagnosis: DiagnosisCardData = {
          diagnosis_name: "Clinical syndrome under evaluation",
          icd11_code: "MG22",
          probability_score: 0.5,
          tags: ["REVIEW"],
          reasoning: "The AI service did not return a structured diagnosis. Review the extracted clinical document and rerun after confirming chief complaint, history, medications, vitals, and labs.",
        };
        addDiagnosis(fallbackDiagnosis);
        collectedDiagnoses.push(fallbackDiagnosis);
        setEngineStability(50);
        diagCount = 1;
        addWorkflowLog({ msg: "AI returned no diagnosis; safe fallback added.", type: "error" });
      }

      if (collectedInteractions.length === 0) {
        collectedInteractions = buildFallbackDrugSafety(currentMedications);
        setInteractions(collectedInteractions);
        addWorkflowLog({ msg: "Drug safety completed with local fallback.", type: "ok" });
      }

      const generatedSoap = buildSoapNoteFromWorkflow({
        chiefComplaint,
        medicalHistory,
        currentMedications,
        documentVitals,
        documentSummary,
        diagnoses: collectedDiagnoses,
        interactions: collectedInteractions,
      });
      SOAP_FIELDS.forEach((field) => updateSoapField(field, generatedSoap[field]));
      addWorkflowLog({ msg: "SOAP note generated from clinical workflow.", type: "ok" });
      addWorkflowLog({ msg: "Full AI workflow complete.", type: "ok" });
      toast.success(`AI workflow complete: ${diagCount} diagnosis match${diagCount !== 1 ? "es" : ""}, drug safety, and SOAP note generated.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI analysis failed";
      console.warn("[Consultation] Live backend analysis failed:", err);
      addWorkflowLog({ msg: message, type: "error" });
      toast.error(message);
    } finally {
      setAnalyzing(false);
      setGeneratingSoap(false);
    }
  };

  const handleXrayConsensus = (finding: string) => {
    setChiefComplaint(prev => {
      const cleanPrev = prev.trim();
      if (cleanPrev.includes(finding)) return prev;
      return cleanPrev ? `${cleanPrev}\n[System] ${finding}` : `[System] ${finding}`;
    });
    addWorkflowLog({ msg: `${finding} added to patient record.`, type: "ok" });
    toast.success("X-Ray finding integrated into consultation context.");
  };

  const handleRecheckResults = ({
    modelResult,
    xrayResult,
  }: {
    modelResult?: PatientRecord["modelResult"] | null;
    xrayResult?: any | null;
  }) => {
    const nextPayload: SavedOnboardingPayload = {
      ...(savedOnboardingPayload || {}),
      patientId: visitId,
      name: savedOnboardingPayload?.name || patientFromStore?.name,
      age: savedOnboardingPayload?.age || patientFromStore?.age,
      sex: savedOnboardingPayload?.sex || patientFromStore?.gender,
      summary: savedOnboardingPayload?.summary || patientFromStore?.complaint,
      rawText: savedOnboardingPayload?.rawText || patientFromStore?.rawText,
      clinicalFields: savedOnboardingPayload?.clinicalFields || patientFromStore?.clinicalFields,
      modelResult: modelResult || savedOnboardingPayload?.modelResult || patientFromStore?.modelResult,
      xrayResult: xrayResult || savedOnboardingPayload?.xrayResult || patientFromStore?.xrayResult,
    };

    setSavedOnboardingPayload(nextPayload);
    if (modelResult) {
      setOnboardingModelResult(modelResult);
    }
    if (xrayResult) {
      setOnboardingXrayResult(xrayResult);
    }

    try {
      localStorage.setItem(`medcopilot:onboarding:${visitId}`, JSON.stringify(nextPayload));
    } catch (error) {
      console.warn("[Consultation] Could not save rechecked diagnostic payload:", error);
    }

    updatePatient(visitId, (patient) => ({
      ...patient,
      modelResult: modelResult || patient.modelResult,
      xrayResult: xrayResult || patient.xrayResult,
    }));

    addWorkflowLog({ msg: "Consultation diagnostics updated from recheck.", type: "ok" });
  };

  const handleAddToPatients = async () => {
    if (!doctorQueueRequest) return;

    const basePatientRecord = doctorQueueRequest.patientRecord;
    const mergedClinicalFields: PatientRecord["clinicalFields"] = {
      ...(basePatientRecord.clinicalFields || {}),
      ...(savedOnboardingPayload?.clinicalFields || {}),
      chief_complaint:
        chiefComplaint.trim() ||
        savedOnboardingPayload?.clinicalFields?.chief_complaint ||
        basePatientRecord.clinicalFields?.chief_complaint,
      medical_history:
        medicalHistory.trim() ||
        savedOnboardingPayload?.clinicalFields?.medical_history ||
        basePatientRecord.clinicalFields?.medical_history,
      current_medications:
        currentMedications.trim() ||
        savedOnboardingPayload?.clinicalFields?.current_medications ||
        basePatientRecord.clinicalFields?.current_medications,
      vitals: {
        ...(basePatientRecord.clinicalFields?.vitals || {}),
        ...(savedOnboardingPayload?.clinicalFields?.vitals || {}),
        ...documentVitals,
      },
      document_excerpt:
        documentSummary.trim() ||
        savedOnboardingPayload?.clinicalFields?.document_excerpt ||
        basePatientRecord.clinicalFields?.document_excerpt,
    };

    const nextRawText =
      documentSummary.trim() ||
      savedOnboardingPayload?.rawText ||
      basePatientRecord.rawText ||
      "";
    const nextModelResult =
      onboardingModelResult ||
      savedOnboardingPayload?.modelResult ||
      basePatientRecord.modelResult ||
      null;
    const nextXrayResult =
      onboardingXrayResult ||
      savedOnboardingPayload?.xrayResult ||
      basePatientRecord.xrayResult ||
      null;
    const queueSummary = buildQueueClinicalSummary({
      complaint:
        chiefComplaint.trim() ||
        savedOnboardingPayload?.summary ||
        basePatientRecord.complaint,
      rawText: nextRawText,
      clinicalFields: mergedClinicalFields,
      modelResult: nextModelResult,
    }).text;

    const nextPatientRecord: PatientRecord = {
      ...basePatientRecord,
      name: savedOnboardingPayload?.name || basePatientRecord.name,
      age: savedOnboardingPayload?.age || basePatientRecord.age,
      gender: savedOnboardingPayload?.sex || basePatientRecord.gender,
      complaint: queueSummary || basePatientRecord.complaint,
      rawText: nextRawText,
      clinicalFields: mergedClinicalFields,
      modelResult: nextModelResult,
      xrayResult: nextXrayResult,
    };

    const existingPatient = patients.find((patient) => patient.id === nextPatientRecord.id);

    if (existingPatient) {
      updatePatient(nextPatientRecord.id, (currentPatient) => ({
        ...currentPatient,
        ...nextPatientRecord,
        clinicalFields: {
          ...(currentPatient.clinicalFields || {}),
          ...(nextPatientRecord.clinicalFields || {}),
          vitals: {
            ...(currentPatient.clinicalFields?.vitals || {}),
            ...(nextPatientRecord.clinicalFields?.vitals || {}),
          },
        },
        modelResult: currentPatient.modelResult || nextPatientRecord.modelResult || null,
        xrayResult: currentPatient.xrayResult || nextPatientRecord.xrayResult || null,
      }));
    } else {
      addPatient(nextPatientRecord);
    }

    setIsAddingToPatients(true);

    try {
      const response = await runAuthorizedRequest(`/api/doctor-inbox/${doctorQueueRequest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "added", isRead: true }),
      }, { accessToken, user, setUser, clearAuth });

      if (!response.ok) {
        throw new Error("Could not sync doctor request status");
      }

      const payload = (await response.json().catch(() => ({}))) as {
        data?: ConsultationDoctorRequest;
      };

      setDoctorQueueRequest(
        payload.data || {
          ...doctorQueueRequest,
          status: "added",
          isRead: true,
          patientRecord: nextPatientRecord,
        }
      );
      toast.success(`${nextPatientRecord.name} added to your patient queue.`);
    } catch (error) {
      console.warn("[Consultation] Could not sync doctor add-to-patients action:", error);
      toast.error("Patient queue updated locally, but request sync failed.");
    } finally {
      setIsAddingToPatients(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFB] overflow-hidden">
      {/* Consultation Header */}
      <header className="h-16 px-10 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-8">
          <h2 className="text-2xl font-bold font-serif text-[#1e293b]">Consultation</h2>
          <div className="flex gap-4">
            {[`VISIT: ${visitId}`, patientDataLabel].map(t => (
              <span key={t} className="px-3 py-1 bg-[#F1F5F9] text-[#64748b] text-[10px] font-bold uppercase tracking-widest rounded">{t}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-[#f1fdf4] border border-[#dcfce7] px-4 py-2 rounded-lg text-[#16a34a] font-mono text-sm font-bold">
            <Clock size={16} /> Active session
          </div>
          <button className="p-2 text-[#94a3b8] hover:text-[#16a34a]"><Bell size={20} /></button>
          <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center">
            <Users size={16} className="text-[#64748b]" />
          </div>
        </div>
      </header>

      {/* Tri-Column Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Column: Inputs */}
        <div className="w-96 border-r border-[#E2E8F0] bg-white overflow-y-auto px-10 py-10 custom-scrollbar space-y-10 shrink-0">

          {documentSummary && (
            <div className="rounded-2xl border border-[#dcfce7] bg-[#f0fdf4] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-[#16a34a]" />
                <label className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase">
                  Extracted Clinical Document
                </label>
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {documentSections.map((section) => (
                  <div key={`${section.label}-${section.value.slice(0, 20)}`} className="rounded-xl border border-[#bbf7d0] bg-white/80 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#16a34a]">
                      {section.label}
                    </p>
                    <p className="text-xs font-semibold leading-relaxed text-[#334155] break-words">
                      {section.value}
                    </p>
                  </div>
                ))}
              </div>
              {!chiefComplaint && !medicalHistory && !currentMedications && Object.keys(documentVitals).length === 0 && (
                <p className="mt-4 rounded-xl border border-[#bbf7d0] bg-white/70 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#64748b]">
                  No labelled clinical fields found. Full OCR text is still loaded for analysis.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-4 block">Chief Complaint</label>
            <textarea
              placeholder="Enter patient concerns..."
              className="w-full h-32 bg-[#F8FAFB] border border-[#E2E8F0] rounded-xl p-4 text-sm font-semibold text-[#1e293b] placeholder:text-[#94a3b8]/60 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 outline-none transition-all resize-none shadow-sm hover:border-[#16a34a]/30"
              value={chiefComplaint}
              onChange={(event) => setChiefComplaint(event.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-4 block">Medical History</label>
            <textarea
              placeholder="Previous diagnoses..."
              className="w-full h-32 bg-[#F8FAFB] border border-[#E2E8F0] rounded-xl p-4 text-sm font-semibold text-[#1e293b] placeholder:text-[#94a3b8]/60 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 outline-none transition-all resize-none shadow-sm hover:border-[#16a34a]/30"
              value={medicalHistory}
              onChange={(event) => setMedicalHistory(event.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase block">Current Medications</label>
            </div>
            <textarea
              placeholder="Enter current medications, dosage, and frequency..."
              className="w-full h-32 bg-[#F8FAFB] border border-[#E2E8F0] rounded-xl p-4 text-sm font-semibold text-[#1e293b] placeholder:text-[#94a3b8]/60 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/10 outline-none transition-all resize-none shadow-sm hover:border-[#16a34a]/30"
              value={currentMedications}
              onChange={(event) => setCurrentMedications(event.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-4 block">Clinical Vitals</label>
            <div className="grid grid-cols-2 gap-4">
              <VitalCard label="BP" value={documentVitals.bp || "--"} unit="" colorClass={documentVitals.bp ? "text-[#16a34a]" : "text-[#94a3b8]"} />
              <VitalCard label="PULSE" value={documentVitals.pulse || "--"} unit="bpm" colorClass={documentVitals.pulse ? "text-[#16a34a]" : "text-[#94a3b8]"} />
              <VitalCard label="TEMP" value={documentVitals.temperature || "--"} unit="F" colorClass={documentVitals.temperature ? "text-[#16a34a]" : "text-[#94a3b8]"} />
              <VitalCard label="SPO2" value={documentVitals.spo2 || "--"} unit="%" colorClass={documentVitals.spo2 ? "text-[#16a34a]" : "text-[#94a3b8]"} />
              <VitalCard label="WEIGHT" value={documentVitals.weight || "--"} unit="kg" colorClass={documentVitals.weight ? "text-[#16a34a]" : "text-[#94a3b8]"} />
              <VitalCard label="RBS" value={documentVitals.rbs || "--"} unit="mg/dL" colorClass={documentVitals.rbs ? "text-[#16a34a]" : "text-[#94a3b8]"} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-4 block">Lab Reports</label>
            <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-6 text-center hover:bg-[#F1FDF4] transition-all group cursor-pointer bg-[#F8FAFB]">
              <FileText className="mx-auto text-[#94a3b8] mb-4" size={32} />
              {documentSummary ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-[0.1em] text-[#16a34a] uppercase">Document data loaded</p>
                  <p className="text-xs font-semibold text-[#64748b] leading-relaxed">
                    Full OCR content is shown in the Extracted Document panel above.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] font-bold tracking-[0.1em] text-[#94a3b8] uppercase">No lab reports attached</p>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: AI Insights */}
        <div className="flex-1 overflow-y-auto px-10 py-10 scrollbar-hide border-r border-[#E2E8F0]">
          <div className="flex items-center justify-between gap-4 mb-10">
            <div className="flex gap-6 shrink-0">
              {["Differential Diagnosis", "Drug Safety", "SOAP Note", "Clinical AI Diagnostic Engine"].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`text-sm font-bold transition-all relative pb-2 ${activeTab === t ? 'text-[#16a34a]' : 'text-[#64748b]'
                    }`}
                >
                  {t}
                  {activeTab === t && <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#16a34a]" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-stretch gap-2 shrink-0 min-w-[240px]">
              {doctorQueueRequest?.status === "pending" && (
                <button
                  type="button"
                  onClick={() => void handleAddToPatients()}
                  disabled={isAddingToPatients}
                  className="inline-flex items-center justify-center gap-3 rounded-lg border border-[#16a34a]/20 bg-[#f0fdf4] px-5 py-3 text-xs font-bold tracking-widest uppercase text-[#16a34a] shadow-sm transition-all hover:bg-[#dcfce7] disabled:opacity-60 w-full"
                >
                  {isAddingToPatients ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  Add To Patients
                </button>
              )}

              {doctorQueueRequest?.status === "added" && (
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dcfce7] bg-[#f0fdf4] px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-[#15803d] w-full">
                  <UserPlus size={14} />
                  Added To Patients
                </span>
              )}

              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-[#16a34a] text-[#16a34a] rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#F1FDF4] transition-all active:scale-95 shadow-sm w-full"
              >
                <FileText size={16} /> Digital Report
              </button>

              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || isGeneratingSoap}
                className="bg-[#16a34a] hover:bg-[#15803d] text-white px-10 py-3 rounded-lg text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg shadow-green-600/20 active:scale-95 transition-all disabled:opacity-70 w-full"
              >
                {isAnalyzing || isGeneratingSoap ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Brain size={16} />
                )}
                Run Full AI Workflow
              </button>
            </div>
          </div>

          <div className="max-w-4xl">
            <AnimatePresence mode="popLayout">
              {activeTab === "Differential Diagnosis" && (
                <motion.div
                  key="diagnosis-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {diagnoses.length > 0 ? (
                    diagnoses.map((d, i) => <DiagnosisBox key={i} d={d} />)
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-white">
                      <Zap size={40} className="mx-auto text-[#94a3b8] mb-4 opacity-20" />
                      <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest">Awaiting Clinical Data Analysis</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "Drug Safety" && (
                <motion.div
                  key="drug-safety-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {interactions.length > 0 ? (
                    interactions.map((interaction, index) => (
                      <div key={`${interaction.drug_a || "drug"}-${interaction.drug_b || "profile"}-${index}`} className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-sm">
                        <div className="flex items-start justify-between gap-6 mb-5">
                          <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-2">
                              Drug Safety Check
                            </p>
                            <h3 className="text-2xl font-bold font-serif text-[#1e293b]">
                              {[interaction.drug_a, interaction.drug_b].filter(Boolean).join(" + ") || "Medication profile"}
                            </h3>
                          </div>
                          <span className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold tracking-widest uppercase ${getSeverityClasses(String(interaction.severity || ""))}`}>
                            {String(interaction.severity || "low")}
                          </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl bg-[#F8FAFB] border border-[#E2E8F0] p-4">
                            <p className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase mb-2">Mechanism</p>
                            <p className="text-sm font-semibold text-[#64748b] leading-relaxed">
                              {String(interaction.mechanism || "No mechanism returned. Review clinically.")}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#F8FAFB] border border-[#E2E8F0] p-4">
                            <p className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase mb-2">Clinical Significance</p>
                            <p className="text-sm font-semibold text-[#64748b] leading-relaxed">
                              {String(interaction.clinical_significance || interaction.alternative_suggested || "No major alert returned by the AI service.")}
                            </p>
                          </div>
                        </div>

                        {(interaction.alternative_suggested || interaction.alternative) && (
                          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                            <p className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase mb-2">Suggested Action</p>
                            <p className="text-sm font-semibold text-[#14532d] leading-relaxed">
                              {String(interaction.alternative_suggested || interaction.alternative)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-white">
                      <FileText size={40} className="mx-auto text-[#94a3b8] mb-4 opacity-20" />
                      <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest">Awaiting Drug Safety Analysis</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "SOAP Note" && (
                <motion.div
                  key="soap-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {SOAP_FIELDS.map((field) => (
                    <div key={field} className="bg-white border border-[#E2E8F0] rounded-2xl p-8 relative">
                      <label className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase mb-4 block">{field}</label>
                      <div className="w-full whitespace-pre-wrap break-words text-sm font-semibold italic text-[#64748b] leading-[1.8]">
                        {soapNote[field] || (isGeneratingSoap ? "Thinking..." : "Pending generation...")}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            {activeTab === "Clinical AI Diagnostic Engine" && (
              <motion.div
                key="diagnostic-engine-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Header and Toggle */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#E2E8F0]">
                  <p className="text-[10px] font-bold text-[#64748b] tracking-widest uppercase flex items-center gap-2">
                    <Zap size={14} className="text-[#16a34a]" />
                    {showRecheckAnalyzer ? "Isolated AI Analysis Mode" : "Onboarding Diagnostic Summary"}
                  </p>
                  <button
                    onClick={() => setShowRecheckAnalyzer(!showRecheckAnalyzer)}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${showRecheckAnalyzer
                        ? "bg-white border border-[#E2E8F0] text-[#64748b] hover:bg-slate-50"
                        : "bg-[#f0fdf4] border border-[#dcfce7] text-[#16a34a] hover:bg-[#dcfce7]"
                      }`}
                  >
                    {showRecheckAnalyzer ? "View Onboarding Results" : "Recheck Symptoms & X-Ray"}
                  </button>
                </div>

                {showRecheckAnalyzer ? (
                  <div className="max-w-2xl mx-auto">
                    <ReportAnalyzer
                      onConsensus={handleXrayConsensus}
                      onResults={handleRecheckResults}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* NLP Model Result */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 relative">
                      <label className="text-[10px] font-bold tracking-[0.2em] text-[#16a34a] uppercase mb-4 flex justify-between items-center">
                        NLP Symptom Extraction
                        {!onboardingModelResult && <span className="text-slate-400">NO DATA FOUND</span>}
                      </label>
                      {onboardingModelResult?.predictions?.length ? (
                        <div className="space-y-4 pt-2">
                          {onboardingModelResult.predictions.map((prediction, i) => {
                            const percentage = Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round(
                                  prediction.probability <= 1
                                    ? prediction.probability * 100
                                    : prediction.probability
                                )
                              )
                            );

                            return (
                              <div key={i} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-emerald-100 hover:bg-emerald-50/40">
                                <div className="mb-3 flex items-center justify-between gap-4">
                                  <div className="flex min-w-0 items-center gap-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 shadow-sm">
                                      {i + 1}
                                    </span>
                                    <span className="truncate text-sm font-bold tracking-wide text-slate-700">
                                      {prediction.disease}
                                    </span>
                                  </div>
                                  <span className="shrink-0 font-mono text-lg font-bold tracking-widest text-emerald-600">
                                    {percentage}%
                                  </span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.55, ease: "easeOut" }}
                                    className="h-full rounded-full bg-[#16a34a] shadow-[0_0_14px_rgba(22,163,74,0.25)]"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm font-semibold italic text-[#64748b] pt-2">No NLP condition predictions generated during onboarding.</p>
                      )}
                    </div>

                    {/* X-Ray Result */}
                    <div className="border rounded-2xl p-8 relative bg-white border-[#E2E8F0]">
                      <label className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 flex justify-between items-center text-[#16a34a]">
                        X-Ray Verdict
                        {!onboardingXrayResult && <span className="text-slate-400">NO X-RAY UPLOADED</span>}
                      </label>

                      {onboardingXrayResult ? (
                        <>
                        <XrayVerdictSummary result={onboardingXrayResult} />
                        </>
                      ) : (
                        <p className="text-sm font-semibold italic text-[#64748b] pt-2">
                          Patient onboarding did not include radiological evidence.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Column: Engine & Timeline */}
      <div className="w-80 overflow-y-auto px-8 py-10 custom-scrollbar space-y-12 shrink-0">
          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-8 block">
              AI Diagnostic Integrity
            </label>
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="#F1F5F9" strokeWidth="12" fill="transparent" />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#16a34a"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="440"
                    animate={{ strokeDashoffset: 440 - (440 * engineStability) / 100 }}
                    transition={{ duration: 1 }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-[#1a2e35] font-serif">
                    {engineStability.toFixed(1)}%
                  </span>
                  <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">
                    Stability
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-8 block">
              Patient Timeline
            </label>
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white p-6 text-center">
              <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">
                No timeline records loaded
              </p>
              <p className="mt-2 text-xs font-semibold text-[#64748b]">
                Timeline data will appear here when the visit API returns patient history.
              </p>
            </div>
          </div>

          <div className="mt-20">
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase mb-4 block">
              Workflow Status
            </label>
            <div className="bg-[#F8FAFB] border border-[#E2E8F0] rounded-xl p-6 font-mono text-[10px] space-y-3">
              {workflowLogs.map((log, i) => (
                <div key={i} className="flex gap-2 items-center">
                  {log.type === "busy" ? (
                    <div className="w-1.5 h-1.5 bg-[#16a34a] rounded-full animate-pulse" />
                  ) : (
                    <span className="text-[#16a34a] font-bold">[OK]</span>
                  )}
                  <span className={log.type === "busy" ? "text-[#16a34a]" : "text-[#64748b]"}>
                    {log.msg}
                  </span>
                </div>
              ))}
              {workflowLogs.length === 0 && !isAnalyzing && (
                <div className="text-[#94a3b8]">No workflow events yet.</div>
              )}
              {isAnalyzing && (
                <div className="flex gap-2 items-center italic text-[#94a3b8] animate-pulse">
                  <span>... streaming results</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MedicalReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        patient={patientFromStore || null}
        diagnoses={diagnoses}
        interactions={interactions}
        soapNote={soapNote}
        doctorName={user?.name || "Dr. MedCoPilot"}
        doctorSpecialty={user?.specialty}
      />
    </div>
  );
}
