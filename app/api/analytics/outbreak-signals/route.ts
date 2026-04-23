import { NextRequest } from "next/server";
import { getOutbreakSignals } from "@/lib/services/analytics-service";

export async function GET(req: NextRequest) {
  return getOutbreakSignals(req);
}
