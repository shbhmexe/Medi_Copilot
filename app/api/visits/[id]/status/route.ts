import { NextRequest } from "next/server";
import { updateVisitStatus } from "@/lib/services/patient-service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateVisitStatus(req, id);
}
