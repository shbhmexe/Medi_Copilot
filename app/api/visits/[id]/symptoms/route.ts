import { NextRequest } from "next/server";
import { addSymptom } from "@/lib/services/patient-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return addSymptom(req, id);
}
