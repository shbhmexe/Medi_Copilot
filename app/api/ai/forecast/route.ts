import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "General Patient Volume";
  const days = searchParams.get("days") || "30";

  try {
    const backendUrl = process.env.AI_INFERENCE_URL || "http://127.0.0.1:8000";
    console.log(`[API Gateway] Fetching Prophet forecast from ${backendUrl}/ai/forecast`);

    const res = await fetch(`${backendUrl}/ai/forecast?topic=${encodeURIComponent(topic)}&days=${days}`);
    
    if (!res.ok) {
      throw new Error(`Python backend responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Gateway] Forecast Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics forecast from AI engine." },
      { status: 500 }
    );
  }
}
