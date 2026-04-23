import { NextResponse } from "next/server";
import { readPatientPass, savePatientPass } from "@/lib/patient-pass-store";
import type { DoctorPassRecord } from "@/lib/patient-portal";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const patientCode = searchParams.get("patientCode");

  if (!patientCode) {
    return NextResponse.json({ success: false, error: "patientCode is required" }, { status: 400 });
  }

  const patientPass = await readPatientPass(patientCode);
  if (!patientPass) {
    return NextResponse.json({ success: false, error: "patient pass not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: patientPass });
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as DoctorPassRecord;

    if (!payload?.patientCode) {
      return NextResponse.json({ success: false, error: "patientCode is required" }, { status: 400 });
    }

    const saved = await savePatientPass(payload);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save patient handoff";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
