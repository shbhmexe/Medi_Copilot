import { NextRequest, NextResponse } from "next/server";

function resolveAiUrl() {
  if (process.env.AI_INFERENCE_LOCAL_URL) {
    return process.env.AI_INFERENCE_LOCAL_URL.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:8000";
  }

  return (process.env.AI_INFERENCE_URL ?? process.env.AI_INFERENCE_SERVICE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
}

const AI_URL = resolveAiUrl();
const XRAY_TIMEOUT_MS = 75_000;

async function readJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

export async function POST(req: NextRequest) {
  let imagePayload = "";

  try {
    const body = await req.json();
    imagePayload = typeof body?.image === "string" ? body.image : "";

    if (!imagePayload) {
      return NextResponse.json(
        { success: false, error: "Missing base64 image payload." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), XRAY_TIMEOUT_MS);

    const upstream = await fetch(`${AI_URL}/ai/xray-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imagePayload }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const data = await readJsonSafely(upstream);

    if (!upstream.ok) {
      const error = data?.detail || data?.error || `X-Ray ML backend returned HTTP ${upstream.status}`;
      return NextResponse.json({ success: false, error }, { status: upstream.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown proxy error.";
    console.error("[predict-xray proxy]", msg);

    if (imagePayload) {
      const reason = err instanceof Error && err.name === "AbortError"
        ? `X-Ray ML backend timed out after ${XRAY_TIMEOUT_MS / 1000}s. Start/redeploy the AI service and retry.`
        : `Failed to connect to X-Ray ML backend at ${AI_URL}. Start the AI service and retry.`;

      return NextResponse.json({ success: false, error: reason }, { status: 504 });
    }

    return NextResponse.json({ success: false, error: "Failed to connect to AI inference service." }, { status: 502 });
  }
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const upstream = await fetch(`${AI_URL}/ai/xray-health`, { signal: controller.signal }).finally(() => clearTimeout(timeout));
    const data = await readJsonSafely(upstream);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, error: "Cannot reach AI inference service." },
      { status: 502 }
    );
  }
}
