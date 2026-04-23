import { NextRequest } from "next/server";
import { getPatientVisits, createVisit } from "@/lib/services/patient-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getPatientVisits(req, id);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return createVisit(req, id);
}
