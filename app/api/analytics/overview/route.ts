import { NextRequest } from "next/server";
import { getOverview } from "@/lib/services/analytics-service";

export async function GET(req: NextRequest) {
  return getOverview(req);
}
