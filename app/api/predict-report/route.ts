import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

type PredictReportPayload = {
  mode?: "text" | "image";
  input?: string;
};

type ModelResult = {
  predictions?: unknown[];
  matched_keywords?: Record<string, string[]>;
  extracted_text?: string;
  error?: string;
};

const AI_SERVICE_URL =
  process.env.AI_INFERENCE_URL ||
  process.env.AI_INFERENCE_SERVICE_URL ||
  "http://127.0.0.1:8000";

const PYTHON_BIN = process.env.PYTHON_BIN || process.env.PYTHON || "python";
const PREDICT_SCRIPT_PATH = "scripts/predict_report.py";

function runTrainedModel(mode: "text", input: string): Promise<ModelResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [PREDICT_SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));

    child.on("close", (code) => {
      try {
        const parsed = JSON.parse(stdout || "{}") as ModelResult;
        if (code !== 0 || parsed.error) {
          reject(new Error(parsed.error || stderr || `Prediction model exited with code ${code}`));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error(stderr || "Prediction model returned invalid JSON"));
      }
    });

    child.stdin.write(JSON.stringify({ mode, input }));
    child.stdin.end();
  });
}

async function extractImageTextWithVision(base64Image: string): Promise<string> {
  const imageBuffer = Buffer.from(base64Image, "base64");
  const formData = new FormData();
  formData.append("file", new Blob([imageBuffer], { type: "image/png" }), "report.png");

  const response = await fetch(`${AI_SERVICE_URL.replace(/\/+$/, "")}/ai/ocr`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || data?.detail || "Google Vision OCR failed");
  }

  const rawText = typeof data.raw_text === "string" ? data.raw_text : "";
  if (!rawText.trim()) {
    throw new Error("Google Vision OCR returned no text");
  }

  return rawText;
}

export async function POST(req: Request) {
  try {
    const { mode, input } = (await req.json()) as PredictReportPayload;

    if (!mode || !["text", "image"].includes(mode)) {
      return NextResponse.json({ success: false, error: "mode must be text or image" }, { status: 400 });
    }

    if (!input?.trim()) {
      return NextResponse.json({ success: false, error: "No input provided" }, { status: 400 });
    }

    const textForModel = mode === "image" ? await extractImageTextWithVision(input) : input;
    const result = await runTrainedModel("text", textForModel);
    
    console.log(`[API Predict] Success! Return result predictions length: `, result?.predictions?.length);

    return NextResponse.json({
      success: true,
      source: "trained_symptom_model",
      ...result,
      extracted_text: mode === "image" ? textForModel : result.extracted_text,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown prediction error";
    console.error(`[API Predict] FAILED: `, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
