import { NextResponse } from "next/server";

const AI_INFERENCE_BASE_URL =
  process.env.AI_INFERENCE_URL ||
  process.env.AI_INFERENCE_SERVICE_URL ||
  "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = `${AI_INFERENCE_BASE_URL}/ai/analyze`;

    console.log(`[API Gateway] Streaming SSE from ${backendUrl}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visit_id: body.visit_id,
        clinical_context: body.clinical_context,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!backendRes.ok || !backendRes.body) {
      throw new Error(`Backend responded with HTTP ${backendRes.status}`);
    }

    // Stream the SSE response directly back to the client
    return new Response(backendRes.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: unknown) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "AI backend timed out"
        : error instanceof Error
          ? error.message
          : "Unknown diagnosis proxy error";

    console.error("[API Gateway] Diagnose Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
