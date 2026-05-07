export type XRayFinding = {
  label?: string;
  status?: string;
  category?: string;
  source?: string;
};

export type XRayDisplayResult = {
  top_class: string | null;
  top_confidence: number;
  all_probabilities: Array<{ class: string; probability: number }>;
  processing_ms?: number;
  low_confidence?: boolean;
  warning?: string | null;
  warnings?: string[];
  display_findings?: XRayFinding[];
  status_class?: "normal" | "abnormal" | "uncertain" | "local_only" | string;
  summary_label?: string;
  summary_text?: string;
  pneumonia_signal?: {
    status?: "detected" | "not_detected" | "uncertain" | string;
    label?: string | null;
    source?: string;
  };
  external_models?: Record<string, unknown>;
};

export function formatXrayLabel(label?: string | null) {
  if (!label) return "Unknown";
  if (label === "NORMAL") return "Normal";
  if (label === "BACTERIAL_PNEUMONIA") return "Bacterial Pneumonia";
  if (label === "VIRAL_PNEUMONIA") return "Viral Pneumonia";
  return label.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getXrayDisplayFindings(result?: XRayDisplayResult | null): XRayFinding[] {
  if (Array.isArray(result?.display_findings)) {
    return result.display_findings.filter((finding) => finding?.label);
  }

  if (result?.top_class) {
    const label = formatXrayLabel(result.top_class);
    return [{
      label,
      status: result.top_class === "NORMAL" ? "No high-confidence abnormal finding" : "Detected",
      category: result.top_class === "NORMAL" ? "normal" : "pneumonia_subtype",
      source: "local_pneumonia_model",
    }];
  }

  return [];
}

export function getXraySummaryLabel(result?: XRayDisplayResult | null) {
  if (result?.summary_label) return result.summary_label;
  return formatXrayLabel(result?.top_class || "No confident X-ray finding");
}

export function getXrayTone(result?: XRayDisplayResult | null) {
  const findings = getXrayDisplayFindings(result);
  const abnormal = findings.some((finding) => {
    const label = (finding.label || "").toLowerCase();
    return finding.category !== "normal" && label !== "normal";
  });

  if (result?.status_class === "uncertain") return "uncertain";
  if (!abnormal && findings.length > 0) return "normal";
  if (abnormal) return "abnormal";
  return "uncertain";
}

export function getXrayToneClasses(result?: XRayDisplayResult | null) {
  const tone = getXrayTone(result);

  if (tone === "normal") {
    return {
      card: "bg-emerald-50 border-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-700",
      heading: "text-emerald-800",
    };
  }

  if (tone === "abnormal") {
    return {
      card: "bg-red-50 border-red-200",
      icon: "bg-red-100 text-red-700",
      text: "text-red-700",
      heading: "text-red-800",
    };
  }

  return {
    card: "bg-amber-50 border-amber-200",
    icon: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
    heading: "text-amber-800",
  };
}

export function buildXrayConsensusText(result?: XRayDisplayResult | null) {
  const labels = getXrayDisplayFindings(result)
    .filter((finding) => finding.category !== "normal")
    .map((finding) => finding.label)
    .filter(Boolean);

  if (labels.length === 0) return null;
  return `X-Ray: ${labels.join(", ")}`;
}

export function getXrayWarnings(result?: XRayDisplayResult | null) {
  const warnings = Array.isArray(result?.warnings) ? [...result.warnings] : [];
  if (result?.warning) warnings.push(result.warning);
  return Array.from(new Set(warnings.filter(Boolean)));
}
