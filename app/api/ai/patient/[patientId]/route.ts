import { NextResponse } from "next/server";

const AI_INFERENCE_BASE_URL =
  process.env.AI_INFERENCE_URL ||
  process.env.AI_INFERENCE_SERVICE_URL ||
  "http://127.0.0.1:8000";

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const backendUrl = joinUrl(AI_INFERENCE_BASE_URL, `/ai/patient/${patientId}`);
    console.log(`[API Gateway] Deleting Patient ${patientId} at ${backendUrl}...`);

    const res = await fetch(backendUrl, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Gateway] Patient Deletion Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
