import { NextRequest } from "next/server";
import { getPatient, updatePatient, getPatientVisits, createVisit } from "@/lib/services/patient-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getPatient(req, id);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updatePatient(req, id);
}
