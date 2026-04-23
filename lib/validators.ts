import { z } from "zod";

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["doctor", "admin", "user", "viewer"]).default("doctor"),
});

export const registerSchema = z.object({
  clinic_name: z.string().min(2, "Clinic name is required"),
  clinic_address: z.string().min(5, "Address is required"),
  clinic_district: z.string().min(2, "District is required"),
  clinic_state: z.string().min(2, "State is required"),
  clinic_pincode: z.string().regex(/^\d{6}$/, "Valid 6-digit pincode required"),
  clinic_specialty: z.string().min(2, "Specialty is required"),
  admin_name: z.string().min(2, "Name is required"),
  admin_email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ---- Patient ----
export const createPatientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.number().int().min(0).max(150),
  gender: z.enum(["male", "female", "other"]),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit Indian phone required"),
  address: z.string().optional(),
  allergies: z.array(z.string()).default([]),
});

export const updatePatientSchema = createPatientSchema.partial();

// ---- Visit ----
export const createVisitSchema = z.object({
  chief_complaint: z.string().optional(),
});

export const updateVisitStatusSchema = z.object({
  status: z.enum(["waiting", "in_progress", "completed"]),
});

// ---- Vitals ----
export const vitalsSchema = z.object({
  bp_systolic: z.number().int().min(60).max(250).optional(),
  bp_diastolic: z.number().int().min(40).max(150).optional(),
  pulse: z.number().int().min(30).max(300).optional(),
  temperature: z.number().min(90).max(110).optional(),
  spo2: z.number().min(50).max(100).optional(),
  weight: z.number().min(1).max(500).optional(),
  rbs: z.number().min(20).max(800).optional(),
});

// ---- Symptoms ----
export const symptomSchema = z.object({
  description: z.string().min(2, "Description is required"),
  duration: z.string().optional(),
  severity: z.number().int().min(1).max(10).optional(),
});

// ---- Medication ----
export const medicationSchema = z.object({
  drug_name: z.string().min(2, "Drug name is required"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  prescribed_by_ai: z.boolean().default(false),
});

// ---- Drug Check ----
export const drugCheckSchema = z.object({
  drugs: z.array(z.string().min(2)).min(2, "At least 2 drugs required"),
});

// ---- AI ----
export const aiAnalyzeSchema = z.object({
  visit_id: z.string().uuid("Invalid visit ID"),
});

// ---- Notify ----
export const referralSchema = z.object({
  visit_id: z.string().uuid(),
  referral_to: z.string().min(2),
  reason: z.string().min(5),
});

export const followupSchema = z.object({
  patient_id: z.string().uuid(),
  follow_up_date: z.string(),
  notes: z.string().optional(),
});
