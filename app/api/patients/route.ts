import { NextRequest } from "next/server";
import { getPatients, createPatient } from "@/lib/services/patient-service";

export async function GET(req: NextRequest) {
  return getPatients(req);
}

export async function POST(req: NextRequest) {
  return createPatient(req);
}
