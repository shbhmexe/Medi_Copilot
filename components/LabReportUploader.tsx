"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, X, FlaskConical, TrendingDown, TrendingUp, Minus } from "lucide-react";

type BiomarkerFlag = "LOW" | "HIGH" | "NORMAL";

interface Biomarker {
  parameter: string;
  value: string;
  unit: string;
  range: string;
  flag: BiomarkerFlag;
}

interface OcrResult {
  success: boolean;
  document_id: string;
  document_type: string;
  extracted_biomarkers: Biomarker[];
  ai_summary: string;
  confidence_score: number;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

const flagConfig: Record<BiomarkerFlag, { color: string; bg: string; Icon: any }> = {
  LOW:    { color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30",   Icon: TrendingDown },
  HIGH:   { color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30",     Icon: TrendingUp   },
  NORMAL: { color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/30", Icon: Minus    },
};

export default function LabReportUploader({ patientId }: { patientId: string }) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Please upload a JPG, PNG, WEBP, or PDF file.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setOcrResult(null);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Vision AI processing failed.");
      }

      setOcrResult(data);
      setUploadState("success");
    } catch (e: any) {
      setErrorMsg(e.message || "Unexpected error during OCR.");
      setUploadState("error");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("idle");
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => {
    setUploadState("idle");
    setOcrResult(null);
    setErrorMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="card-medcopilot mt-6">
      <h3 className="text-lg font-semibold text-medcopilot-text-primary mb-4 flex items-center gap-2 border-b border-medcopilot-border-subtle pb-2">
        <FlaskConical size={18} className="text-medcopilot-cyan" />
        Lab Report OCR
      </h3>

      <AnimatePresence mode="wait">

        {/* IDLE / DRAGGING STATE */}
        {(uploadState === "idle" || uploadState === "dragging") && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onDragOver={(e) => { e.preventDefault(); setUploadState("dragging"); }}
            onDragLeave={() => setUploadState("idle")}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 p-10 flex flex-col items-center justify-center gap-4 text-center
              ${uploadState === "dragging"
                ? "border-medcopilot-cyan bg-medcopilot-cyan/5 scale-[1.01]"
                : "border-medcopilot-border-subtle hover:border-medcopilot-cyan/60 hover:bg-white/[0.02]"
              }`}
          >
            <motion.div
              animate={{ y: uploadState === "dragging" ? -6 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-14 h-14 rounded-2xl bg-medcopilot-cyan/10 border border-medcopilot-cyan/20 flex items-center justify-center"
            >
              <UploadCloud size={28} className="text-medcopilot-cyan" />
            </motion.div>
            <div>
              <p className="font-semibold text-medcopilot-text-primary">
                {uploadState === "dragging" ? "Release to analyze" : "Drag & drop a lab report"}
              </p>
              <p className="text-sm text-medcopilot-text-muted mt-1">
                Supports PDF, JPG, PNG, WEBP &mdash; Vision AI will extract biomarkers automatically
              </p>
            </div>
            <span className="text-xs text-medcopilot-cyan/70 border border-medcopilot-cyan/20 bg-medcopilot-cyan/5 px-4 py-1.5 rounded-full">
              Click to browse files
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </motion.div>
        )}

        {/* UPLOADING STATE */}
        {uploadState === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-medcopilot-border-subtle p-10 flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-medcopilot-cyan/20 flex items-center justify-center">
                <Loader2 size={32} className="text-medcopilot-cyan animate-spin" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-medcopilot-cyan/0"
                animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-medcopilot-text-primary">Vision AI Processing...</p>
              <p className="text-sm text-medcopilot-text-muted mt-1">Extracting biomarkers and clinical data</p>
            </div>
            <div className="flex gap-2">
              {["Reading OCR", "Mapping biomarkers", "Generating summary"].map((step, i) => (
                <motion.span
                  key={step}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.5 }}
                  className="text-[10px] text-medcopilot-cyan/70 border border-medcopilot-cyan/20 bg-medcopilot-cyan/5 px-3 py-1 rounded-full"
                >
                  {step}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ERROR STATE */}
        {uploadState === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-4"
          >
            <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">Processing Failed</p>
              <p className="text-sm text-red-400/80 mt-1">{errorMsg}</p>
            </div>
            <button onClick={reset} className="text-medcopilot-text-muted hover:text-white transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {/* SUCCESS: RESULTS STATE */}
        {uploadState === "success" && ocrResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-300 text-sm">{ocrResult.document_type}</p>
                  <p className="text-xs text-medcopilot-text-muted">{ocrResult.ai_summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">
                  {(ocrResult.confidence_score * 100).toFixed(0)}% confidence
                </span>
                <button onClick={reset} className="text-medcopilot-text-muted hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Biomarkers Grid */}
            <div className="grid grid-cols-1 gap-2">
              {ocrResult.extracted_biomarkers.map((marker, i) => {
                const cfg = flagConfig[marker.flag];
                const FlagIcon = cfg.Icon;
                return (
                  <motion.div
                    key={marker.parameter}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center justify-between p-3 rounded-lg border ${cfg.bg}`}
                  >
                    <div className="flex items-center gap-3">
                      <FlagIcon size={15} className={cfg.color} />
                      <span className="text-sm font-medium text-medcopilot-text-primary">{marker.parameter}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className={`text-sm font-bold font-mono ${cfg.color}`}>{marker.value}</span>
                        <span className="text-xs text-medcopilot-text-muted ml-1">{marker.unit}</span>
                      </div>
                      <div className="text-xs text-medcopilot-text-muted hidden sm:block">Ref: {marker.range}</div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                        {marker.flag}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Document ID */}
            <p className="text-[10px] font-mono text-medcopilot-text-muted/50 text-right">
              Document ID: {ocrResult.document_id}
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
