import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const backendUrl =
      process.env.AI_INFERENCE_URL ||
      process.env.AI_INFERENCE_SERVICE_URL ||
      "http://127.0.0.1:8000";
    console.log(`[API Gateway] Sending file ${file.name} to ${backendUrl}/ai/ocr`);

    // Forward the multipart form data request to the Python backend
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    const res = await fetch(`${backendUrl}/ai/ocr`, {
      method: "POST",
      body: backendFormData,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Python backend responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("[API Gateway] OCR Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process document through Vision AI." },
      { status: 500 }
    );
  }
}
