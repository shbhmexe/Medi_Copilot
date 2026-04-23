import { NextRequest, NextResponse } from "next/server";

const AI_URL = process.env.AI_INFERENCE_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.image || typeof body.image !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing base64 image payload." },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${AI_URL}/ai/xray-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: body.image }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail ?? "AI backend error." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown proxy error.";
    console.error("[predict-xray proxy]", msg);
    return NextResponse.json(
      { success: false, error: "Failed to connect to AI inference service." },
      { status: 502 }
    );
  }
}

export async function GET() {
  try {
    const upstream = await fetch(`${AI_URL}/ai/xray-health`);
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, error: "Cannot reach AI inference service." },
      { status: 502 }
    );
  }
}
