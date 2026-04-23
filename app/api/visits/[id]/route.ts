import { NextRequest } from "next/server";
import { getVisit } from "@/lib/services/patient-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getVisit(req, id);
}
