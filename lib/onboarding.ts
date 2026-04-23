"use client";

import { buildQueueClinicalSummary } from "@/lib/clinical-display";
import type { OnboardingSuccessPayload } from "@/components/modals/add-patient-modal";
import type { PatientRecord } from "@/store";

export function buildPatientInitials(name: string) {
  const [first = "", second = ""] = name.trim().split(/\s+/);
  return `${first[0] || ""}${second[0] || ""}`.toUpperCase() || "PT";
}

export function mergeClinicalFields(
  existing?: PatientRecord["clinicalFields"],
  incoming?: PatientRecord["clinicalFields"]
): PatientRecord["clinicalFields"] {
  if (!existing && !incoming) return null;

  return {
    ...(existing || {}),
    ...(incoming || {}),
    vitals: {
      ...(existing?.vitals || {}),
      ...(incoming?.vitals || {}),
    },
  };
}

export function buildPatientRecordFromOnboarding(
  payload: OnboardingSuccessPayload,
  existing?: PatientRecord
): PatientRecord {
  const mergedClinicalFields = mergeClinicalFields(existing?.clinicalFields, payload.clinicalFields);
  const complaint = buildQueueClinicalSummary({
    ...existing,
    ...payload,
    clinicalFields: mergedClinicalFields,
    modelResult: payload.modelResult || existing?.modelResult || null,
  }).text;

  return {
    id: payload.patientId,
    initials: buildPatientInitials(payload.name),
    name: payload.name,
    age: payload.age,
    gender: payload.sex,
    wait: existing?.wait || "Now",
    complaint,
    status: existing?.status || "WAITING",
    isUrgent: existing?.isUrgent || false,
    rawText: payload.rawText || existing?.rawText,
    clinicalFields: mergedClinicalFields,
    modelResult: payload.modelResult || existing?.modelResult || null,
    xrayResult: payload.xrayResult || existing?.xrayResult || null,
  };
}
