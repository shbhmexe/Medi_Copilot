import { NextRequest } from "next/server";
import { getDailyVolume } from "@/lib/services/analytics-service";

export async function GET(req: NextRequest) {
  return getDailyVolume(req);
}
