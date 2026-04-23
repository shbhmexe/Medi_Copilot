import { NextRequest } from "next/server";
import { getDiagnosisDistribution } from "@/lib/services/analytics-service";

export async function GET(req: NextRequest) {
  return getDiagnosisDistribution(req);
}
