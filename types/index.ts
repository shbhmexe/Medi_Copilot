// ==========================================
// MedCoPilot — Shared TypeScript Types
// ==========================================

export type UserRole = "doctor" | "admin" | "user" | "viewer";
export type SubscriptionTier = "free" | "premium" | "enterprise";
export type VisitStatus = "waiting" | "in_progress" | "completed";
export type OcrStatus = "pending" | "processing" | "completed" | "failed";
export type ConfidenceLevel = "high" | "medium" | "low";
export type DrugSeverity = "major" | "moderate" | "minor";
export type Gender = "male" | "female" | "other";

// ---- Auth ----
export interface AuthUser {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty?: string;
  preferred_language?: string;
}

export interface ClinicianProfile {
  id: string;
  clinic_id: string;
  clinic_name: string;
  name: string;
  email: string;
  role: "doctor" | "admin";
  specialty: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterRequest {
  clinic_name: string;
  clinic_address: string;
  clinic_district: string;
  clinic_state: string;
  clinic_pincode: string;
  clinic_specialty: string;
  admin_name: string;
  admin_email: string;
  password: string;
}

// ---- Clinic ----
export interface Clinic {
  id: string;
  name: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  specialty: string;
  subscription_tier: SubscriptionTier;
  created_at: string;
  is_active: boolean;
}

// ---- Patient ----
export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  age: number;
  gender: Gender;
  blood_group?: string;
  phone: string;
  address?: string;
  allergies: string[];
  created_at: string;
  updated_at: string;
}

export interface CreatePatientRequest {
  name: string;
  age: number;
  gender: Gender;
  blood_group?: string;
  phone: string;
  address?: string;
  allergies?: string[];
}

// ---- Visit ----
export interface Visit {
  id: string;
  patient_id: string;
  clinic_id: string;
  doctor_id: string;
  chief_complaint?: string;
  status: VisitStatus;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  patient?: Patient;
  vitals?: Vitals;
  symptoms?: Symptom[];
  diagnoses?: Diagnosis[];
  medications?: Medication[];
  soap_note?: SoapNote;
  lab_reports?: LabReport[];
  drug_interactions?: DrugInteraction[];
}

// ---- Vitals ----
export interface Vitals {
  id: string;
  visit_id: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  rbs?: number;
  recorded_at: string;
}

export interface VitalsInput {
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  rbs?: number;
}

// ---- Symptoms ----
export interface Symptom {
  id: string;
  visit_id: string;
  description: string;
  duration?: string;
  severity?: number;
  recorded_at: string;
}

// ---- Diagnosis ----
export interface Diagnosis {
  id: string;
  visit_id: string;
  diagnosis_name: string;
  icd11_code?: string;
  probability_score: number;
  confidence_level: ConfidenceLevel;
  reasoning?: string;
  is_primary: boolean;
  generated_by_ai: boolean;
  created_at: string;
}

// ---- Medication ----
export interface Medication {
  id: string;
  visit_id: string;
  drug_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  prescribed_by_ai: boolean;
  created_at: string;
}

// ---- Drug Interaction ----
export interface DrugInteraction {
  id: string;
  visit_id: string;
  drug_a: string;
  drug_b: string;
  severity: DrugSeverity;
  mechanism?: string;
  alternative_suggested?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface DrugInteractionCheckResult {
  drug_a: string;
  drug_b: string;
  severity: DrugSeverity;
  mechanism: string;
  alternative_suggested?: string;
  clinical_significance: string;
}

// ---- Lab Report ----
export interface LabReport {
  id: string;
  visit_id: string;
  file_url: string;
  file_type: string;
  ocr_status: OcrStatus;
  extracted_values?: Record<string, string | number>;
  uploaded_at: string;
}

// ---- SOAP Note ----
export interface SoapNote {
  id: string;
  visit_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  generated_by_ai: boolean;
  exported_at?: string;
  created_at: string;
}

// ---- AI SSE Events ----
export type AiEventType = "thinking" | "diagnosis_card" | "interaction_check" | "soap_field" | "complete" | "error";

export interface AiThinkingEvent {
  type: "thinking";
  message: string;
  step: number;
}

export interface AiDiagnosisCardEvent {
  type: "diagnosis_card";
  data: Diagnosis;
}

export interface AiInteractionCheckEvent {
  type: "interaction_check";
  data: DrugInteractionCheckResult[];
}

export interface AiSoapFieldEvent {
  type: "soap_field";
  field: "subjective" | "objective" | "assessment" | "plan";
  content: string;
}

export interface AiCompleteEvent {
  type: "complete";
  visit_id: string;
}

export type AiSseEvent =
  | AiThinkingEvent
  | AiDiagnosisCardEvent
  | AiInteractionCheckEvent
  | AiSoapFieldEvent
  | AiCompleteEvent;

// ---- Analytics ----
export interface AnalyticsOverview {
  total_patients: number;
  ai_analyses_run: number;
  drug_interactions_flagged: number;
  avg_confidence: number;
  patients_change: number;
  analyses_change: number;
  interactions_change: number;
}

export interface DailyVolume {
  date: string;
  patients: number;
  visits: number;
}

export interface DiagnosisDistribution {
  name: string;
  value: number;
  color: string;
}

export interface TopInteraction {
  drug_a: string;
  drug_b: string;
  count: number;
  severity: DrugSeverity;
}

// ---- API Response Envelope ----
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---- Queue / Dashboard ----
export interface QueueEntry {
  visit_id: string;
  patient: Patient;
  status: VisitStatus;
  chief_complaint?: string;
  wait_minutes: number;
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  type: "ai_analysis" | "drug_alert" | "new_patient" | "lab_upload" | "soap_generated";
  message: string;
  patient_name?: string;
  severity?: DrugSeverity;
  timestamp: string;
}
