import { NextRequest } from "next/server";
import { checkDrugInteractions } from "@/lib/services/drug-service";

export async function POST(req: NextRequest) {
  return checkDrugInteractions(req);
}
