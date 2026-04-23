import { NextRequest } from "next/server";
import { generateSoap } from "@/lib/services/ai-service";

export async function POST(req: NextRequest) {
  return generateSoap(req);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
