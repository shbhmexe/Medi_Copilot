import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DoctorPassRecord } from "@/lib/patient-portal";

const PATIENT_PASS_DIR = path.join(process.cwd(), "data", "patient-passes");

function sanitizePatientCode(patientCode: string) {
  return patientCode.replace(/[^a-zA-Z0-9-_]/g, "").toUpperCase();
}

function getPatientPassFilePath(patientCode: string) {
  return path.join(PATIENT_PASS_DIR, `${sanitizePatientCode(patientCode)}.json`);
}

export async function savePatientPass(record: DoctorPassRecord) {
  const patientCode = sanitizePatientCode(record.patientCode);
  const nextRecord: DoctorPassRecord = {
    ...record,
    patientCode,
    handoffRoute: record.handoffRoute,
    consultationRoute: record.consultationRoute,
    generatedAt: new Date().toISOString(),
  };

  await mkdir(PATIENT_PASS_DIR, { recursive: true });
  await writeFile(getPatientPassFilePath(patientCode), JSON.stringify(nextRecord, null, 2), "utf8");
  return nextRecord;
}

export async function readPatientPass(patientCode: string) {
  try {
    const raw = await readFile(getPatientPassFilePath(patientCode), "utf8");
    return JSON.parse(raw) as DoctorPassRecord;
  } catch {
    return null;
  }
}
