import { NextResponse } from "next/server";

type PredictReportPayload = {
  mode?: "text" | "image";
  input?: string;
};

const AI_SERVICE_URL =
  process.env.AI_INFERENCE_URL ||
  process.env.AI_INFERENCE_SERVICE_URL ||
  "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const { mode, input } = (await req.json()) as PredictReportPayload;

    if (!mode || !["text", "image"].includes(mode)) {
      return NextResponse.json({ success: false, error: "mode must be text or image" }, { status: 400 });
    }

    if (!input?.trim()) {
      return NextResponse.json({ success: false, error: "No input provided" }, { status: 400 });
    }

    const response = await fetch(`${AI_SERVICE_URL.replace(/\/+$/, "")}/ai/report-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, input }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.detail || data?.error || "AI report prediction failed");
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown prediction error";
    console.error(`[API Predict] FAILED: `, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
