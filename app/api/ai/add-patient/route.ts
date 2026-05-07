import { NextResponse } from "next/server";

const AI_INFERENCE_BASE_URL =
  process.env.AI_INFERENCE_URL ||
  process.env.AI_INFERENCE_SERVICE_URL ||
  "http://127.0.0.1:8000";

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

async function readBackendError(res: Response): Promise<string> {
  const payload = await res.text();
  if (!payload) return `AI service returned HTTP ${res.status}`;

  try {
    const parsed = JSON.parse(payload) as { detail?: string; error?: string; message?: string };
    return parsed.detail || parsed.error || parsed.message || payload;
  } catch {
    return payload;
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const backendUrl = joinUrl(AI_INFERENCE_BASE_URL, "/ai/add-patient");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    console.log(`[API Gateway] Forwarding Patient Onboarding to ${backendUrl}...`);

    const res = await fetch(backendUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      const backendError = await readBackendError(res);
      return NextResponse.json(
        { success: false, error: backendError },
        { status: res.status }
      );
    }

    const data = await res.json();
    if (!data?.success) {
      return NextResponse.json(
        { success: false, error: data?.error || "Patient onboarding failed in AI service." },
        { status: 502 }
      );
    }

    return NextResponse.json(data);

  } catch (error: unknown) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Timed out while extracting the clinical document. Handwritten or multi-page reports can take up to 90 seconds."
        : error instanceof Error
          ? error.message
          : "Unknown onboarding proxy error";

    console.error("[API Gateway] Onboarding Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
