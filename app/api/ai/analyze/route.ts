import { NextRequest, NextResponse } from "next/server";

const PYTHON_AI_SERVICE_URL = process.env.AI_INFERENCE_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.visit_id || !body.clinical_context) {
      return NextResponse.json(
        { success: false, error: "visit_id and clinical_context are required" },
        { status: 400 }
      );
    }

    // Proxy the request to the Python FastAPI microservice
    const response = await fetch(`${PYTHON_AI_SERVICE_URL}/ai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visit_id: body.visit_id,
        clinical_context: body.clinical_context
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Microservice Error (${response.status}):`, errorText);
      return NextResponse.json({ error: "AI Inference Service Failed" }, { status: response.status });
    }

    // Return the SSE stream directly to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Proxy error mapping to AI microservice:", err);
    return NextResponse.json({ error: "API Gateway failed to reach AI microservice." }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
