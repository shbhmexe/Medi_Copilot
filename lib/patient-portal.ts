"use client";

import { format, formatDistanceToNow } from "date-fns";
import { buildPatientInitials } from "@/lib/onboarding";
import type {
  PatientPortalAppointment,
  PatientPortalNotification,
  PatientPortalProfile,
  PatientRecord,
} from "@/store";

export interface DoctorPassRecord {
  patientCode: string;
  handoffRoute: string;
  detailRoute?: string;
  consultationRoute: string;
  generatedAt: string;
  patient: {
    fullName?: string;
    age?: string;
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    phone?: string;
    email?: string;
    address?: string;
    occupation?: string;
    insuranceId?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  vitals?: Record<string, string>;
  history?: {
    currentSymptoms?: string;
    pastHistory?: string;
    chronicConditions?: string;
    surgicalHistory?: string;
    familyHistory?: string;
    allergies?: string;
    currentMedications?: string;
    lifestyleNotes?: string;
  };
  booking?: {
    appointmentId?: string;
    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;
    specialty?: string;
    hospitalName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    visitType?: string;
    reason?: string;
    symptoms?: string;
    status?: string;
  };
}

const PROFILE_COMPLETION_FIELDS: Array<keyof PatientPortalProfile> = [
  "fullName",
  "phone",
  "dateOfBirth",
  "gender",
  "bloodGroup",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "allergies",
  "currentMedications",
  "pastHistory",
  "currentSymptoms",
];

function safeDate(input?: string) {
  if (!input) return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function compactParts(parts: Array<string | undefined | null>) {
  return parts.map((part) => (part || "").trim()).filter(Boolean);
}

function resolveShareOrigin(origin?: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || origin || "").replace(/\/$/, "");
}

function pruneEmpty<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    return (value.trim() ? value : undefined) as T | undefined;
  }

  if (Array.isArray(value)) {
    const nextArray = value
      .map((entry) => pruneEmpty(entry))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
    return (nextArray.length ? nextArray : undefined) as T | undefined;
  }

  if (typeof value === "object") {
    const nextEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, pruneEmpty(entry)] as const)
      .filter(([, entry]) => entry !== undefined);

    return (nextEntries.length ? Object.fromEntries(nextEntries) : undefined) as T | undefined;
  }

  return value;
}

export function getProfileCompletion(profile?: PatientPortalProfile | null) {
  if (!profile) return 0;
  const filled = PROFILE_COMPLETION_FIELDS.filter((field) => Boolean(profile[field]?.trim())).length;
  return Math.round((filled / PROFILE_COMPLETION_FIELDS.length) * 100);
}

export function getMissingProfileFields(profile?: PatientPortalProfile | null) {
  if (!profile) return PROFILE_COMPLETION_FIELDS;
  return PROFILE_COMPLETION_FIELDS.filter((field) => !profile[field]?.trim());
}

export function formatAppointmentDateTime(date: string, time: string) {
  const parsedDate = safeDate(date);
  if (!parsedDate) return compactParts([date, time]).join(" · ");
  return compactParts([format(parsedDate, "EEE, dd MMM yyyy"), time]).join(" · ");
}

export function formatRelativeTimestamp(value: string) {
  const parsedDate = safeDate(value);
  if (!parsedDate) return "Recently";
  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function buildMedicalHistorySummary(profile: PatientPortalProfile) {
  return compactParts([
    profile.pastHistory && `Past history: ${profile.pastHistory}`,
    profile.chronicConditions && `Chronic conditions: ${profile.chronicConditions}`,
    profile.surgicalHistory && `Surgical history: ${profile.surgicalHistory}`,
    profile.familyHistory && `Family history: ${profile.familyHistory}`,
    profile.lifestyleNotes && `Lifestyle: ${profile.lifestyleNotes}`,
  ]).join(" ");
}

export function buildCurrentSymptomsSummary(
  profile: PatientPortalProfile,
  appointment?: PatientPortalAppointment | null
) {
  const parts = compactParts([
    appointment?.reason,
    appointment?.symptoms,
    profile.currentSymptoms,
  ]);
  return Array.from(new Set(parts)).join(". ");
}

export function buildVitalsMap(profile: PatientPortalProfile) {
  const vitals: Record<string, string> = {};

  if (profile.bpSystolic && profile.bpDiastolic) vitals.bp = `${profile.bpSystolic}/${profile.bpDiastolic}`;
  if (profile.pulse) vitals.pulse = profile.pulse;
  if (profile.temperatureF) vitals.temperature = profile.temperatureF;
  if (profile.spo2) vitals.spo2 = profile.spo2;
  if (profile.weightKg) vitals.weight = profile.weightKg;
  if (profile.sugarMgDl) vitals.rbs = profile.sugarMgDl;

  return vitals;
}

export function buildPortalClinicalFields(
  profile: PatientPortalProfile,
  appointment?: PatientPortalAppointment | null
) {
  const chiefComplaint = buildCurrentSymptomsSummary(profile, appointment);
  const medicalHistory = buildMedicalHistorySummary(profile);
  const documentExcerpt = compactParts([
    `Patient code: ${profile.patientCode}`,
    profile.fullName && `Name: ${profile.fullName}`,
    profile.age && `Age: ${profile.age}`,
    profile.gender && `Gender: ${profile.gender}`,
    appointment?.doctorName && `Doctor: ${appointment.doctorName}`,
    appointment?.specialty && `Specialty: ${appointment.specialty}`,
    appointment?.hospitalName && `Hospital: ${appointment.hospitalName}`,
    appointment?.appointmentDate && `Appointment date: ${formatAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime)}`,
    chiefComplaint && `Chief Complaint: ${chiefComplaint}`,
    medicalHistory && `Medical History: ${medicalHistory}`,
    profile.currentMedications && `Current Medications: ${profile.currentMedications}`,
    profile.allergies && `Allergies: ${profile.allergies}`,
  ]).join("\n");

  return {
    chief_complaint: chiefComplaint || undefined,
    medical_history: medicalHistory || undefined,
    current_medications: profile.currentMedications || undefined,
    vitals: buildVitalsMap(profile),
    document_excerpt: documentExcerpt || undefined,
  };
}

export function buildPatientPassRoute(patientCode: string, origin?: string) {
  const path = `/patient-pass/${patientCode}`;
  const shareOrigin = resolveShareOrigin(origin);
  return shareOrigin ? `${shareOrigin}${path}` : path;
}

export function buildPatientPassDetailRoute(patientCode: string, origin?: string) {
  const path = `/patient-pass/${patientCode}/details`;
  const shareOrigin = resolveShareOrigin(origin);
  return shareOrigin ? `${shareOrigin}${path}` : path;
}

export function buildPortalRawText(
  profile: PatientPortalProfile,
  appointment?: PatientPortalAppointment | null
) {
  const clinicalFields = buildPortalClinicalFields(profile, appointment);

  return compactParts([
    clinicalFields.document_excerpt,
    appointment?.visitType && `Visit Type: ${appointment.visitType}`,
    appointment?.status && `Status: ${appointment.status}`,
    profile.address && `Address: ${profile.address}`,
    profile.emergencyContactName &&
      `Emergency Contact: ${profile.emergencyContactName} (${profile.emergencyContactRelation || "contact"}) ${profile.emergencyContactPhone}`,
  ]).join("\n");
}

export function buildPortalPatientRecord(
  profile: PatientPortalProfile,
  appointment: PatientPortalAppointment,
  existing?: PatientRecord
): PatientRecord {
  const clinicalFields = buildPortalClinicalFields(profile, appointment);
  const complaint = buildCurrentSymptomsSummary(profile, appointment) || "Appointment booked via patient portal";

  return {
    id: profile.patientCode,
    clinicId: appointment.clinicId,
    initials: buildPatientInitials(profile.fullName || "Patient"),
    name: profile.fullName || "Patient",
    age: Number(profile.age) || 0,
    gender: profile.gender || "Other",
    wait: formatAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime),
    complaint,
    status: "WAITING",
    isUrgent: /urgent|emergency|severe|critical/i.test(`${appointment.reason} ${appointment.symptoms}`),
    rawText: buildPortalRawText(profile, appointment),
    clinicalFields,
    assignedDoctorId: appointment.doctorId,
    assignedDoctorName: appointment.doctorName,
    assignedDoctorSpecialty: appointment.specialty,
    assignedDoctorEmail: appointment.doctorEmail,
    bookingId: appointment.id,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    modelResult: existing?.modelResult || null,
    xrayResult: existing?.xrayResult || null,
  };
}

export function buildConsultationSeedPayload(
  profile: PatientPortalProfile,
  appointment: PatientPortalAppointment
) {
  const clinicalFields = buildPortalClinicalFields(profile, appointment);

  return {
    patientId: profile.patientCode,
    name: profile.fullName || "Patient",
    age: Number(profile.age) || 0,
    sex: profile.gender || "Other",
    summary: buildCurrentSymptomsSummary(profile, appointment) || appointment.reason || "Appointment booking",
    rawText: buildPortalRawText(profile, appointment),
    clinicalFields,
    analysisInput:
      buildCurrentSymptomsSummary(profile, appointment) ||
      clinicalFields.chief_complaint ||
      "",
    booking: {
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      doctorEmail: appointment.doctorEmail,
      specialty: appointment.specialty,
      hospitalName: appointment.hospitalName,
      doctorRoute: appointment.doctorRoute,
      qrValue: appointment.qrValue,
    },
  };
}

export function buildDoctorPassRecord(
  profile: PatientPortalProfile,
  appointment?: PatientPortalAppointment | null,
  origin?: string
): DoctorPassRecord {
  const payload = pruneEmpty({
    patientCode: profile.patientCode,
    handoffRoute: buildPatientPassRoute(profile.patientCode, origin),
    detailRoute: buildPatientPassDetailRoute(profile.patientCode, origin),
    consultationRoute:
      appointment?.doctorRoute ||
      (resolveShareOrigin(origin)
        ? `${resolveShareOrigin(origin)}/consultation/${profile.patientCode}`
        : `/consultation/${profile.patientCode}`),
    generatedAt: new Date().toISOString(),
    booking: {
      appointmentId: appointment?.id,
      doctorId: appointment?.doctorId,
      doctorName: appointment?.doctorName,
      doctorEmail: appointment?.doctorEmail,
      specialty: appointment?.specialty,
      hospitalName: appointment?.hospitalName,
      appointmentDate: appointment?.appointmentDate,
      appointmentTime: appointment?.appointmentTime,
      visitType: appointment?.visitType,
      reason: appointment?.reason,
      symptoms: appointment?.symptoms,
      status: appointment?.status,
    },
    patient: {
      fullName: profile.fullName,
      age: profile.age,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      bloodGroup: profile.bloodGroup,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      occupation: profile.occupation,
      insuranceId: profile.insuranceId,
    },
    emergencyContact: {
      name: profile.emergencyContactName,
      phone: profile.emergencyContactPhone,
      relation: profile.emergencyContactRelation,
    },
    vitals: buildVitalsMap(profile),
    history: {
      currentSymptoms: profile.currentSymptoms,
      pastHistory: profile.pastHistory,
      chronicConditions: profile.chronicConditions,
      surgicalHistory: profile.surgicalHistory,
      familyHistory: profile.familyHistory,
      allergies: profile.allergies,
      currentMedications: profile.currentMedications,
      lifestyleNotes: profile.lifestyleNotes,
    },
  });

  return (payload || {
    patientCode: profile.patientCode,
    handoffRoute: buildPatientPassRoute(profile.patientCode, origin),
    detailRoute: buildPatientPassDetailRoute(profile.patientCode, origin),
    consultationRoute: resolveShareOrigin(origin)
      ? `${resolveShareOrigin(origin)}/consultation/${profile.patientCode}`
      : `/consultation/${profile.patientCode}`,
    generatedAt: new Date().toISOString(),
  }) as DoctorPassRecord;
}

export function getUpcomingAppointment(
  appointments: PatientPortalAppointment[],
  userId: string
) {
  return appointments
    .filter((appointment) => appointment.userId === userId && appointment.status === "Booked")
    .sort((left, right) => {
      const leftDate = safeDate(left.appointmentDate)?.getTime() || 0;
      const rightDate = safeDate(right.appointmentDate)?.getTime() || 0;
      return leftDate - rightDate;
    })[0];
}

export function getUnreadNotificationCount(
  notifications: PatientPortalNotification[],
  userId: string
) {
  return notifications.filter((notification) => notification.userId === userId && !notification.isRead).length;
}
