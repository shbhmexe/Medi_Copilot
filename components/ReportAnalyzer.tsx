"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Upload, Keyboard, Loader2, AlertCircle,
  ChevronDown, ChevronUp, CheckCircle2, Microscope, X, Stethoscope
} from "lucide-react";
import { useAuthStore } from "@/store";

interface Prediction {
  disease: string;
  probability: number;
  icd11_code: string;
}

interface PredictResult {
  predictions: Prediction[];
  matched_keywords: Record<string, string[]>;
  extracted_text?: string;
}

interface XRayProb {
  class: string;
  probability: number;
}

interface XRayResult {
  top_class: string;
  top_confidence: number;
  all_probabilities: XRayProb[];
  low_confidence: boolean;
  warning: string | null;
  processing_ms: number;
}

type AnalyzerResultsPayload = {
  mode: Mode;
  modelResult?: PredictResult | null;
  xrayResult?: XRayResult | null;
};

type Mode = "text" | "image" | "xray";
type Status = "idle" | "loading" | "success" | "error";

// Severity colour based on confidence rank
const rankColors = [
  "ring-red-500/60 bg-red-500/5",
  "ring-amber-500/60 bg-amber-500/5",
  "ring-blue-400/60 bg-blue-400/5",
  "ring-slate-500/40 bg-white/5",
  "ring-slate-500/30 bg-white/[0.02]",
];

const XRAY_CLIENT_TIMEOUT_MS = 210_000;

export default function ReportAnalyzer({
  onConsensus,
  onResults,
}: {
  onConsensus?: (disease: string) => void;
  onResults?: (payload: AnalyzerResultsPayload) => void;
}) {
  const { accessToken, user, setUser } = useAuthStore();
  const [mode, setMode] = useState<Mode>("text");
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── X-Ray state ──────────────────────────────────────────────
  const [xrayFile, setXrayFile]         = useState<File | null>(null);
  const [xrayPreview, setXrayPreview]   = useState<string | null>(null);
  const [xrayResult, setXrayResult]     = useState<XRayResult | null>(null);
  const [xrayDragOver, setXrayDragOver] = useState(false);
  const [xrayStatus, setXrayStatus]     = useState<Status>("idle");
  const [xrayError, setXrayError]       = useState("");
  const xrayFileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Please upload a JPG, PNG or WEBP image of the symptom report.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const b64 = (e.target?.result as string).split(",")[1];
        await runPrediction("image", b64);
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const runPrediction = async (inputMode: Mode, input: string) => {
    setStatus("loading");
    try {
      const requestBody = JSON.stringify({ mode: inputMode, input });
      const buildHeaders = (token: string | null) => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });
      const runRequest = (token: string | null) =>
        fetch("/api/predict-report", {
          method: "POST",
          headers: buildHeaders(token),
          credentials: "include",
          body: requestBody,
        });

      let res = await runRequest(accessToken);

      if (res.status === 401 && user) {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        const refreshedToken =
          typeof refreshData?.data?.access_token === "string"
            ? refreshData.data.access_token
            : null;

        if (refreshRes.ok && refreshedToken) {
          setUser(user, refreshedToken);
          res = await runRequest(refreshedToken);
        }
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorDetail = data.error;
        const msg =
          typeof errorDetail === "string"
            ? errorDetail
            : typeof errorDetail?.message === "string"
            ? errorDetail.message
            : res.ok
            ? "Prediction failed with no reason given"
            : `Server error ${res.status}`;
        throw new Error(msg);
      }
      setResult(data);
      setStatus("success");
      setExpandedCard(0);
      onResults?.({ mode: inputMode, modelResult: data });
      if (onConsensus && data.predictions?.[0]) {
        onConsensus(data.predictions[0].disease);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    runPrediction("text", textInput);
  };

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setTextInput("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── X-Ray handler ────────────────────────────────────────────
  const handleXraySelect = async (file: File) => {
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      setXrayError("Please upload a JPG or PNG chest X-ray image.");
      setXrayStatus("error");
      return;
    }
    setXrayFile(file);
    setXrayResult(null);
    setXrayError("");
    setXrayStatus("loading");
    const preview = URL.createObjectURL(file);
    setXrayPreview(preview);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const b64 = (e.target?.result as string).split(",")[1];
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), XRAY_CLIENT_TIMEOUT_MS);
          const requestBody = JSON.stringify({ image: b64 });
          const buildHeaders = (token: string | null) => ({
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          });
          const runRequest = (token: string | null) =>
            fetch("/api/predict-xray", {
              method: "POST",
              headers: buildHeaders(token),
              credentials: "include",
              body: requestBody,
              signal: controller.signal,
            });

          let res: Response;

          try {
            res = await runRequest(accessToken);

            if (res.status === 401 && user) {
              const refreshRes = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include",
              });
              const refreshData = await refreshRes.json().catch(() => ({}));
              const refreshedToken =
                typeof refreshData?.data?.access_token === "string"
                  ? refreshData.data.access_token
                  : null;

              if (refreshRes.ok && refreshedToken) {
                setUser(user, refreshedToken);
                res = await runRequest(refreshedToken);
              }
            }
          } finally {
            window.clearTimeout(timeout);
          }

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success) {
            const errDetail = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error ?? `Server error ${res.status}`);
            throw new Error(errDetail);
          }
          const r: XRayResult = data.data;
          setXrayResult(r);
          setXrayStatus("success");
          onResults?.({ mode: "xray", xrayResult: r });
          // Feed result into parent consensus if Pneumonia
          if (onConsensus && r.top_class !== "NORMAL") {
            onConsensus(`X-Ray: ${r.top_class} (${r.top_confidence.toFixed(1)}%)`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error && err.name === "AbortError"
            ? "X-Ray request timed out. Open the AI service health URL once, then retry after the model finishes loading."
            : err instanceof Error ? err.message : String(err);
          setXrayError(msg);
          setXrayStatus("error");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setXrayError(msg);
      setXrayStatus("error");
    }
  };

  const resetXray = () => {
    setXrayFile(null);
    setXrayPreview(null);
    setXrayResult(null);
    setXrayError("");
    setXrayStatus("idle");
    if (xrayFileRef.current) xrayFileRef.current.value = "";
  };

  return (
    <div className="card-medcopilot space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-medcopilot-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-medcopilot-cyan/10 border border-medcopilot-cyan/20 flex items-center justify-center">
            <Microscope size={20} className="text-medcopilot-cyan" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-medcopilot-text-primary">Clinical AI Diagnostic Engine</h3>
            <p className="text-[10px] text-medcopilot-text-muted/70 mt-0.5">
              OCR + NLP model · Trained on gretelai + Symptom2Disease + venetis · Zero external APIs
            </p>
          </div>
        </div>
        {(status !== "idle" || xrayStatus !== "idle") && (
          <button onClick={() => { reset(); resetXray(); }} className="text-medcopilot-text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Mode Toggle — 3 tabs */}
      <div className="flex p-1 bg-white/5 border border-medcopilot-border-subtle rounded-xl">
        <button
          onClick={() => { setMode("text"); reset(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
            ${mode === "text"
              ? "bg-medcopilot-cyan/10 text-medcopilot-cyan border border-medcopilot-cyan/30"
              : "text-medcopilot-text-muted hover:text-[#1e293b]"
            }`}
        >
          <Keyboard size={16} /> Type Symptoms
        </button>
        <button
          onClick={() => { setMode("image"); reset(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
            ${mode === "image"
              ? "bg-medcopilot-cyan/10 text-medcopilot-cyan border border-medcopilot-cyan/30"
              : "text-medcopilot-text-muted hover:text-[#1e293b]"
            }`}
        >
          <Upload size={16} /> Upload Report
        </button>
        <button
          onClick={() => { setMode("xray"); resetXray(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
            ${mode === "xray"
              ? "bg-blue-500/10 text-blue-400 border border-blue-400/30"
              : "text-medcopilot-text-muted hover:text-[#1e293b]"
            }`}
        >
          <Stethoscope size={16} /> X-Ray AI
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ── TEXT / IMAGE modes (existing) ── */}
        {mode !== "xray" && status === "idle" && (
          <motion.div key="input" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {mode === "text" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g. patient has been feeling feverish with body ache, dry cough, loss of appetite and mild rash for 3 days..."
                  rows={5}
                  className="w-full bg-white/5 border border-medcopilot-border-subtle rounded-xl p-4 text-sm text-medcopilot-text-primary placeholder:text-medcopilot-text-muted/50 focus:outline-none focus:border-medcopilot-cyan/50 resize-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg shadow-green-600/20 active:scale-95 transition-all"
                >
                  <FlaskConical size={16} /> Analyze Symptoms
                </button>
              </form>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 p-10 flex flex-col items-center gap-4 text-center
                  ${dragOver
                    ? "border-medcopilot-cyan bg-medcopilot-cyan/5"
                    : "border-medcopilot-border-subtle hover:border-medcopilot-cyan/60"
                  }`}
              >
                <motion.div
                  animate={{ y: dragOver ? -6 : 0 }}
                  className="w-14 h-14 rounded-2xl bg-medcopilot-cyan/10 border border-medcopilot-cyan/20 flex items-center justify-center"
                >
                  <Upload size={28} className="text-medcopilot-cyan" />
                </motion.div>
                <div>
                  <p className="font-semibold text-medcopilot-text-primary">
                    {dragOver ? "Release to analyze" : "Drop a symptom report image"}
                  </p>
                  <p className="text-sm text-medcopilot-text-muted mt-1">JPG, PNG, WEBP — same format as training data</p>
                </div>
                <input
                  ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* ── X-RAY mode ── */}
        {mode === "xray" && xrayStatus === "idle" && (
          <motion.div key="xray-idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setXrayDragOver(true); }}
              onDragLeave={() => setXrayDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setXrayDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleXraySelect(f); }}
              onClick={() => xrayFileRef.current?.click()}
              className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 p-10 flex flex-col items-center gap-4 text-center
                ${xrayDragOver ? "border-blue-400 bg-blue-400/5" : "border-medcopilot-border-subtle hover:border-blue-400/60"}`}
            >
              <motion.div animate={{ y: xrayDragOver ? -6 : 0 }} className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                <Stethoscope size={28} className="text-blue-400" />
              </motion.div>
              <div>
                <p className="font-semibold text-medcopilot-text-primary">
                  {xrayDragOver ? "Release to analyze" : "Drop a Chest X-Ray image here"}
                </p>
                <p className="text-sm text-medcopilot-text-muted mt-1">JPG or PNG · Max 10 MB · Min 100×100 px</p>
              </div>
              <input ref={xrayFileRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleXraySelect(f); }}
              />
            </div>
            {/* Info strip */}
            <p className="text-center text-[10px] text-medcopilot-text-muted/50 mt-3">
              MobileNetV2 · Transfer Learning · Trained on NIH Chest X-Ray Dataset · 3-class classification · No cloud API
            </p>
          </motion.div>
        )}

        {/* X-Ray loading */}
        {mode === "xray" && xrayStatus === "loading" && (
          <motion.div key="xray-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-10"
          >
            <div className="relative">
              <Loader2 size={36} className="text-blue-400 animate-spin" />
              <motion.div className="absolute inset-0 rounded-full border-2 border-blue-400/0"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
              />
            </div>
            <p className="text-sm text-medcopilot-text-muted">Running MobileNetV2 inference on X-Ray…</p>
          </motion.div>
        )}

        {/* X-Ray error */}
        {mode === "xray" && xrayStatus === "error" && (
          <motion.div key="xray-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/30"
          >
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">X-Ray Analysis Failed</p>
              <p className="text-xs text-red-400/80 mt-1">{xrayError}</p>
              <button onClick={resetXray} className="mt-3 text-xs text-blue-400 underline">Try Again</button>
            </div>
          </motion.div>
        )}

        {/* X-Ray success */}
        {mode === "xray" && xrayStatus === "success" && xrayResult && (
          <motion.div key="xray-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Confidence warning */}
            {xrayResult.low_confidence && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-300">
                <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  Low confidence result — review with a qualified radiologist before clinical use.
                </p>
              </div>
            )}

            {/* X-Ray Preview + Results side-by-side */}
            <div className="flex gap-5 items-start">
              {/* Preview */}
              {xrayPreview && (
                <div className="flex-shrink-0">
                  <img src={xrayPreview} alt="Uploaded X-Ray" className="w-[130px] h-[130px] rounded-xl object-cover border-2 border-[#E2E8F0] shadow-sm" />
                  <p className="text-[9px] text-center text-[#94a3b8] mt-1 font-medium uppercase tracking-widest">Chest X-Ray</p>
                </div>
              )}

              {/* Probability bars */}
              <div className="flex-1 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748b] mb-3">Classification Breakdown</p>
                {xrayResult.all_probabilities.map((prob, idx) => {
                  const isTop = prob.class === xrayResult.top_class;
                  const label = prob.class === "NORMAL" ? "Normal"
                    : prob.class === "BACTERIAL_PNEUMONIA" ? "Bacterial Pneumonia"
                    : "Viral Pneumonia";
                  const barColor = prob.class === "NORMAL"
                    ? "bg-emerald-500"
                    : prob.class === "BACTERIAL_PNEUMONIA"
                    ? "bg-red-500"
                    : "bg-amber-500";
                  const textColor = prob.class === "NORMAL"
                    ? "text-emerald-700"
                    : prob.class === "BACTERIAL_PNEUMONIA"
                    ? "text-red-700"
                    : "text-amber-700";
                  return (
                    <div key={prob.class}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${isTop ? textColor : "text-[#64748b]"}`}>
                          {isTop && <span className="mr-1">▶</span>}{label}
                        </span>
                        <span className={`text-xs font-mono font-bold ${isTop ? textColor : "text-[#94a3b8]"}`}>
                          {prob.probability.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${barColor} ${isTop ? "opacity-100" : "opacity-30"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${prob.probability}%` }}
                          transition={{ duration: 0.7, delay: idx * 0.1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verdict card */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
              xrayResult.top_class === "NORMAL"
                ? "bg-emerald-50 border-emerald-300"
                : xrayResult.top_class === "VIRAL_PNEUMONIA"
                ? "bg-amber-50 border-amber-300"
                : "bg-red-50 border-red-300"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  xrayResult.top_class === "NORMAL" ? "bg-emerald-100" : xrayResult.top_class === "VIRAL_PNEUMONIA" ? "bg-amber-100" : "bg-red-100"
                }`}>
                  <CheckCircle2 size={18} className={
                    xrayResult.top_class === "NORMAL" ? "text-emerald-600" : xrayResult.top_class === "VIRAL_PNEUMONIA" ? "text-amber-600" : "text-red-600"
                  } />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">AI Verdict</p>
                  <p className={`text-sm font-bold ${
                    xrayResult.top_class === "NORMAL" ? "text-emerald-700" : xrayResult.top_class === "VIRAL_PNEUMONIA" ? "text-amber-700" : "text-red-700"
                  }`}>
                    {xrayResult.top_class === "NORMAL" ? "Normal" : xrayResult.top_class === "VIRAL_PNEUMONIA" ? "Viral Pneumonia" : "Bacterial Pneumonia"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Confidence</p>
                <p className={`text-lg font-bold font-mono ${
                  xrayResult.top_class === "NORMAL" ? "text-emerald-700" : xrayResult.top_class === "VIRAL_PNEUMONIA" ? "text-amber-700" : "text-red-700"
                }`}>
                  {xrayResult.top_confidence.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Reset */}
            <button onClick={resetXray} className="text-xs text-[#64748b] hover:text-[#1e293b] underline transition-colors">
              ↩ Analyze another X-Ray
            </button>

            {/* Footer strip */}
            <p className="text-center text-[10px] text-[#94a3b8]/70">
              MobileNetV2 · Transfer Learning · Trained on NIH Chest X-Ray Dataset · 3-class · No cloud API
            </p>
          </motion.div>
        )}

        {/* ── Loading (text/image modes) ── */}
        {mode !== "xray" && status === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-10"
          >
            <div className="relative">
              <Loader2 size={36} className="text-medcopilot-cyan animate-spin" />
              <motion.div className="absolute inset-0 rounded-full border-2 border-medcopilot-cyan/0"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
              />
            </div>
            <p className="text-sm text-medcopilot-text-muted">Running OCR → TF-IDF → MultinomialNB pipeline...</p>
          </motion.div>
        )}

        {/* ── Error (text/image modes) ── */}
        {mode !== "xray" && status === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/30"
          >
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Analysis Failed</p>
              <p className="text-xs text-red-400/80 mt-1">{errorMsg}</p>
              <button onClick={reset} className="mt-3 text-xs text-medcopilot-cyan underline">Try Again</button>
            </div>
          </motion.div>
        )}

        {/* ── Success (text/image modes) ── */}
        {mode !== "xray" && status === "success" && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {result.extracted_text && (
              <div className="p-3 rounded-xl bg-white/5 border border-medcopilot-border-subtle">
                <p className="text-[10px] font-bold uppercase tracking-widest text-medcopilot-text-muted mb-2">OCR Extracted Text</p>
                <p className="text-xs text-medcopilot-text-secondary leading-relaxed line-clamp-3">{result.extracted_text}</p>
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-widest text-medcopilot-text-muted">Differential Diagnosis (NLP Model)</p>

            <div className="space-y-3">
              {result.predictions.map((pred, i) => {
                const pct = Math.round(pred.probability * 100);
                const isExpanded = expandedCard === i;
                const keywords = result.matched_keywords[pred.disease] || [];

                return (
                  <motion.div
                    key={pred.disease}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-xl border ring-1 overflow-hidden transition-all ${rankColors[i] ?? rankColors[4]}`}
                  >
                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : i)}
                      className="w-full p-4 text-left flex items-center gap-4"
                    >
                      <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-medcopilot-text-primary flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-medcopilot-text-primary truncate">{pred.disease}</p>
                          <span className="text-sm font-bold font-mono text-medcopilot-cyan ml-3 flex-shrink-0">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-medcopilot-cyan rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-medcopilot-text-muted flex-shrink-0" /> : <ChevronDown size={16} className="text-medcopilot-text-muted flex-shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-medcopilot-text-muted uppercase tracking-widest">ICD-11</span>
                              <span className="font-mono text-xs text-medcopilot-cyan border border-medcopilot-cyan/30 bg-medcopilot-cyan/5 px-2 py-0.5 rounded">
                                {pred.icd11_code}
                              </span>
                            </div>
                            {keywords.length > 0 && (
                              <div>
                                <p className="text-[10px] text-medcopilot-text-muted uppercase tracking-widest mb-2">Key Terms Matched</p>
                                <div className="flex flex-wrap gap-2">
                                  {keywords.map(kw => (
                                    <span key={kw} className="text-[10px] px-2 py-1 bg-medcopilot-cyan/10 border border-medcopilot-cyan/20 text-medcopilot-cyan rounded-full font-medium">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {result.predictions[0] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
              >
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Awaiting 3-Model Consensus</p>
                  <p className="text-[10px] text-medcopilot-text-muted mt-0.5">
                    Local NLP → <span className="text-emerald-400 font-bold">{result.predictions[0].disease}</span> ({Math.round(result.predictions[0].probability * 100)}%) · Compare with Llama-3 + Neo4j results
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
