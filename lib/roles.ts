import type { UserRole, AuthUser } from "@/types";
import type { PatientRecord } from "@/store";

const PATIENT_ONLY_PREFIXES = ["/records", "/booking", "/profile", "/notifications", "/help"];
const DOCTOR_ONLY_PREFIXES = ["/patients", "/queue", "/drug-checker", "/analytics", "/consultation"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPatientRole(role?: UserRole | null) {
  return role === "user" || role === "viewer";
}

export function isDoctorRole(role?: UserRole | null) {
  return role === "doctor" || role === "admin";
}

export function isPatientOnlyPath(pathname: string) {
  return PATIENT_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isDoctorOnlyPath(pathname: string) {
  return DOCTOR_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function filterPatientsForClinician(patients: PatientRecord[], user?: AuthUser | null) {
  if (!user) return patients;

  return patients.filter((patient) => {
    if (user.role === "doctor") {
      if (patient.clinicId && patient.clinicId !== user.clinic_id) {
        return false;
      }

      return patient.assignedDoctorId ? patient.assignedDoctorId === user.id : true;
    }

    if (user.role === "admin") {
      return patient.clinicId ? patient.clinicId === user.clinic_id : true;
    }

    return false;
  });
}
