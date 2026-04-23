import { NextRequest } from "next/server";
import { getTopInteractions } from "@/lib/services/analytics-service";

export async function GET(req: NextRequest) {
  return getTopInteractions(req);
}
