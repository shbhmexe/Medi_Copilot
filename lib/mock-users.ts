import type { AuthUser, ClinicianProfile } from "@/types";

export const MOCK_CLINIC_ID = "mock-clinic-uuid";
export const LEGACY_MOCK_PATIENT_CLINIC_ID = "mock-patient-portal";
export const MOCK_ADMIN_ID = "mock-admin-uuid";
export const MOCK_DOCTOR_ID = "mock-doctor-uuid";
export const MOCK_PATIENT_ID = "mock-user-uuid";

export function isMockClinicId(clinicId?: string | null) {
  return clinicId === MOCK_CLINIC_ID || clinicId === LEGACY_MOCK_PATIENT_CLINIC_ID;
}

export function buildMockAdminUser(): AuthUser {
  return {
    id: MOCK_ADMIN_ID,
    clinic_id: MOCK_CLINIC_ID,
    name: "Dr. Admin",
    email: "admin@medcopilot.com",
    role: "admin",
    specialty: "General Medicine",
  };
}

export function buildMockDoctorUser(): AuthUser {
  return {
    id: MOCK_DOCTOR_ID,
    clinic_id: MOCK_CLINIC_ID,
    name: "Dr. Meera Iyer",
    email: "doctor@medcopilot.com",
    role: "doctor",
    specialty: "Internal Medicine",
  };
}

export function buildMockPatientUser(): AuthUser {
  return {
    id: MOCK_PATIENT_ID,
    clinic_id: MOCK_CLINIC_ID,
    name: "Aakash Rana",
    email: "user@medcopilot.com",
    role: "user",
    preferred_language: "en",
  };
}

export function buildMockClinicianProfiles(): ClinicianProfile[] {
  return [
    {
      id: MOCK_ADMIN_ID,
      clinic_id: MOCK_CLINIC_ID,
      clinic_name: "MedCoPilot Demo Clinic",
      name: "Dr. Admin",
      email: "admin@medcopilot.com",
      role: "admin",
      specialty: "General Medicine",
    },
    {
      id: MOCK_DOCTOR_ID,
      clinic_id: MOCK_CLINIC_ID,
      clinic_name: "MedCoPilot Demo Clinic",
      name: "Dr. Meera Iyer",
      email: "doctor@medcopilot.com",
      role: "doctor",
      specialty: "Internal Medicine",
    },
  ];
}
