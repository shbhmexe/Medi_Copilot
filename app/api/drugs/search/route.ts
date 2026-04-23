import { NextRequest } from "next/server";
import { searchDrugs } from "@/lib/services/drug-service";

export async function GET(req: NextRequest) {
  return searchDrugs(req);
}
