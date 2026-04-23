-- ============================================================
-- MedCoPilot Clinical Decision Support System
-- Complete PostgreSQL / Supabase Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CLINICS
-- ============================================================
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode CHAR(6) NOT NULL,
  specialty TEXT NOT NULL DEFAULT 'General Medicine',
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','premium','enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_clinics_state ON clinics(state);
CREATE INDEX idx_clinics_district ON clinics(district);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'doctor' CHECK (role IN ('doctor','admin','viewer')),
  specialty TEXT,
  preferred_language TEXT DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clinic_id ON users(clinic_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- encrypted in app layer
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
  gender TEXT NOT NULL CHECK (gender IN ('male','female','other')),
  blood_group TEXT CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  phone TEXT NOT NULL, -- encrypted in app layer
  address TEXT, -- encrypted in app layer
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- ============================================================
-- VISITS
-- ============================================================
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES users(id),
  chief_complaint TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_clinic_id ON visits(clinic_id);
CREATE INDEX idx_visits_doctor_id ON visits(doctor_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at DESC);

-- ============================================================
-- VITALS
-- ============================================================
CREATE TABLE vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE UNIQUE,
  bp_systolic INTEGER CHECK (bp_systolic BETWEEN 60 AND 250),
  bp_diastolic INTEGER CHECK (bp_diastolic BETWEEN 40 AND 150),
  pulse INTEGER CHECK (pulse BETWEEN 30 AND 300),
  temperature DECIMAL(4,1) CHECK (temperature BETWEEN 90 AND 110),
  spo2 DECIMAL(5,2) CHECK (spo2 BETWEEN 50 AND 100),
  weight DECIMAL(6,2) CHECK (weight BETWEEN 1 AND 500),
  rbs DECIMAL(7,2) CHECK (rbs BETWEEN 20 AND 800),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vitals_visit_id ON vitals(visit_id);

-- ============================================================
-- SYMPTOMS
-- ============================================================
CREATE TABLE symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  duration TEXT,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_symptoms_visit_id ON symptoms(visit_id);

-- ============================================================
-- LAB REPORTS
-- ============================================================
CREATE TABLE lab_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending','processing','completed','failed')),
  extracted_values JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_reports_visit_id ON lab_reports(visit_id);
CREATE INDEX idx_lab_reports_ocr_status ON lab_reports(ocr_status);

-- ============================================================
-- DIAGNOSES
-- ============================================================
CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  diagnosis_name TEXT NOT NULL,
  icd11_code TEXT,
  probability_score DECIMAL(5,4) CHECK (probability_score BETWEEN 0 AND 1),
  confidence_level TEXT NOT NULL DEFAULT 'medium' CHECK (confidence_level IN ('high','medium','low')),
  reasoning TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnoses_visit_id ON diagnoses(visit_id);
CREATE INDEX idx_diagnoses_clinic_id ON diagnoses(clinic_id);
CREATE INDEX idx_diagnoses_is_primary ON diagnoses(is_primary);

-- ============================================================
-- MEDICATIONS
-- ============================================================
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  drug_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  prescribed_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medications_visit_id ON medications(visit_id);
CREATE INDEX idx_medications_drug_name ON medications(drug_name);

-- ============================================================
-- DRUG INTERACTIONS
-- ============================================================
CREATE TABLE drug_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  drug_a TEXT NOT NULL,
  drug_b TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('major','moderate','minor')),
  mechanism TEXT,
  alternative_suggested TEXT,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drug_interactions_visit_id ON drug_interactions(visit_id);
CREATE INDEX idx_drug_interactions_clinic_id ON drug_interactions(clinic_id);
CREATE INDEX idx_drug_interactions_severity ON drug_interactions(severity);

-- ============================================================
-- SOAP NOTES
-- ============================================================
CREATE TABLE soap_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE UNIQUE,
  subjective TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  assessment TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soap_notes_visit_id ON soap_notes(visit_id);

-- ============================================================
-- AUDIT LOGS (append-only)
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_clinic_id ON audit_logs(clinic_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Prevent updates and deletes on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- ============================================================
-- N8N WORKFLOW LOGS
-- ============================================================
CREATE TABLE n8n_workflow_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  workflow_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered','completed','failed')),
  payload JSONB DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_n8n_workflow_logs_clinic_id ON n8n_workflow_logs(clinic_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to extract clinic_id from JWT
CREATE OR REPLACE FUNCTION get_clinic_id_from_jwt()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', TRUE)::JSONB->>'clinic_id')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to extract role from JWT
CREATE OR REPLACE FUNCTION get_role_from_jwt()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', TRUE)::JSONB->>'role';
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies: patients can only see their clinic's data
CREATE POLICY clinics_isolation ON patients FOR ALL USING (clinic_id = get_clinic_id_from_jwt());
CREATE POLICY visits_isolation ON visits FOR ALL USING (clinic_id = get_clinic_id_from_jwt());
CREATE POLICY vitals_isolation ON vitals FOR ALL USING (visit_id IN (SELECT id FROM visits WHERE clinic_id = get_clinic_id_from_jwt()));
CREATE POLICY symptoms_isolation ON symptoms FOR ALL USING (visit_id IN (SELECT id FROM visits WHERE clinic_id = get_clinic_id_from_jwt()));
CREATE POLICY lab_reports_isolation ON lab_reports FOR ALL USING (clinic_id = get_clinic_id_from_jwt());
CREATE POLICY diagnoses_isolation ON diagnoses FOR ALL USING (clinic_id = get_clinic_id_from_jwt());
CREATE POLICY medications_isolation ON medications FOR ALL USING (clinic_id = get_clinic_id_from_jwt());
CREATE POLICY drug_interactions_isolation ON drug_interactions FOR ALL USING (clinic_id = get_clinic_id_from_jwt());
CREATE POLICY soap_notes_isolation ON soap_notes FOR ALL USING (visit_id IN (SELECT id FROM visits WHERE clinic_id = get_clinic_id_from_jwt()));
-- audit_logs: readable only by admin role
CREATE POLICY audit_logs_admin_only ON audit_logs FOR SELECT USING (clinic_id = get_clinic_id_from_jwt() AND get_role_from_jwt() = 'admin');
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY n8n_logs_isolation ON n8n_workflow_logs FOR ALL USING (clinic_id = get_clinic_id_from_jwt());
