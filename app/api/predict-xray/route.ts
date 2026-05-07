import { NextRequest, NextResponse } from "next/server";

const DEFAULT_AI_URL = "https://medcopilot-ai.onrender.com";
const XRAY_TIMEOUT_MS = 180_000;

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function resolveAiUrls(requestOrigin?: string) {
  if (process.env.AI_INFERENCE_LOCAL_URL) {
    return [normalizeUrl(process.env.AI_INFERENCE_LOCAL_URL)];
  }

  if (process.env.NODE_ENV !== "production") {
    return ["http://127.0.0.1:8000"];
  }

  const configured = process.env.AI_INFERENCE_URL ?? process.env.AI_INFERENCE_SERVICE_URL;
  const candidates = [configured, DEFAULT_AI_URL]
    .filter((url): url is string => Boolean(url?.trim()))
    .map((url) => normalizeUrl(url.trim()));

  return Array.from(new Set(candidates)).filter((url) => url !== requestOrigin);
}

async function readBackendPayload(res: Response) {
  const text = await res.text();
  if (!text) return { data: {}, nonJson: false };

  try {
    return { data: JSON.parse(text), nonJson: false };
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 240);
    return {
      data: {
        error:
          "AI backend returned a non-JSON response. Check that AI_INFERENCE_URL points to the FastAPI service, not the web app.",
        detail: snippet,
      },
      nonJson: true,
    };
  }
}

export async function POST(req: NextRequest) {
  let imagePayload = "";
  let timeout: ReturnType<typeof setTimeout> | undefined;

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
    timeout = setTimeout(() => controller.abort(), XRAY_TIMEOUT_MS);
    const aiUrls = resolveAiUrls(req.nextUrl.origin);
    let lastError = "X-Ray ML backend did not return a usable response.";

    for (const aiUrl of aiUrls) {
      const startedAt = Date.now();
      console.log(`[predict-xray proxy] Forwarding X-Ray request to ${aiUrl}/ai/xray-predict`);

      const upstream = await fetch(`${aiUrl}/ai/xray-predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imagePayload }),
        signal: controller.signal,
      });

      const { data, nonJson } = await readBackendPayload(upstream);
      console.log(
        `[predict-xray proxy] Upstream ${aiUrl} responded with HTTP ${upstream.status} in ${Date.now() - startedAt}ms`
      );

      lastError = data?.error || data?.detail || `X-Ray ML backend returned HTTP ${upstream.status}`;

      if (nonJson && aiUrl !== aiUrls[aiUrls.length - 1]) {
        continue;
      }

      if (!upstream.ok) {
        clearTimeout(timeout);
        return NextResponse.json({ success: false, error: lastError }, { status: upstream.status });
      }

      if (!data?.success) {
        clearTimeout(timeout);
        return NextResponse.json(
          {
            success: false,
            error:
              lastError ||
              "X-Ray ML backend returned an invalid response. Check the AI service URL and deployment logs.",
          },
          { status: 502 }
        );
      }

      clearTimeout(timeout);
      return NextResponse.json(data);
    }

    clearTimeout(timeout);
    return NextResponse.json({ success: false, error: lastError }, { status: 502 });
  } catch (err: unknown) {
    if (timeout) clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : "Unknown proxy error.";
    console.error("[predict-xray proxy]", msg);

    if (imagePayload) {
      const reason = err instanceof Error && err.name === "AbortError"
        ? `X-Ray ML backend timed out after ${XRAY_TIMEOUT_MS / 1000}s. Open ${DEFAULT_AI_URL}/ai/xray-health once, then retry.`
        : `Failed to connect to X-Ray ML backend. Start the AI service and retry.`;

      return NextResponse.json({ success: false, error: reason }, { status: 504 });
    }

    return NextResponse.json({ success: false, error: "Failed to connect to AI inference service." }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 120_000);
    const aiUrls = resolveAiUrls(req.nextUrl.origin);
    let lastData: unknown = { success: false, error: "Cannot reach AI inference service." };

    for (const aiUrl of aiUrls) {
      const upstream = await fetch(`${aiUrl}/ai/xray-health`, { signal: controller.signal });
      const { data, nonJson } = await readBackendPayload(upstream);
      lastData = data;

      if (nonJson && aiUrl !== aiUrls[aiUrls.length - 1]) {
        continue;
      }

      clearTimeout(timeout);
      return NextResponse.json(data, { status: upstream.ok ? 200 : upstream.status });
    }

    clearTimeout(timeout);
    return NextResponse.json(lastData, { status: 502 });
  } catch {
    if (timeout) clearTimeout(timeout);
    return NextResponse.json(
      { success: false, error: "Cannot reach AI inference service." },
      { status: 502 }
    );
  }
}
