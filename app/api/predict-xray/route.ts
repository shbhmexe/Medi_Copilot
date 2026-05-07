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
const XRAY_TIMEOUT_MS = 180_000;

async function readJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 240);
    return {
      error:
        "AI backend returned a non-JSON response. Check that AI_INFERENCE_URL points to the FastAPI service, not the web app.",
      detail: snippet,
    };
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
    const startedAt = Date.now();

    console.log(`[predict-xray proxy] Forwarding X-Ray request to ${AI_URL}/ai/xray-predict`);

    const upstream = await fetch(`${AI_URL}/ai/xray-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imagePayload }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const data = await readJsonSafely(upstream);
    console.log(
      `[predict-xray proxy] Upstream responded with HTTP ${upstream.status} in ${Date.now() - startedAt}ms`
    );

    if (!upstream.ok) {
      const error = data?.error || data?.detail || `X-Ray ML backend returned HTTP ${upstream.status}`;
      return NextResponse.json({ success: false, error }, { status: upstream.status });
    }

    if (!data?.success) {
      const error =
        data?.error ||
        data?.detail ||
        "X-Ray ML backend returned an invalid response. Check the AI service URL and deployment logs.";
      return NextResponse.json({ success: false, error }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown proxy error.";
    console.error("[predict-xray proxy]", msg);

    if (imagePayload) {
      const reason = err instanceof Error && err.name === "AbortError"
        ? `X-Ray ML backend timed out after ${XRAY_TIMEOUT_MS / 1000}s. Open ${AI_URL}/ai/xray-health once, then retry.`
        : `Failed to connect to X-Ray ML backend at ${AI_URL}. Start the AI service and retry.`;

      return NextResponse.json({ success: false, error: reason }, { status: 504 });
    }

    return NextResponse.json({ success: false, error: "Failed to connect to AI inference service." }, { status: 502 });
  }
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
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
