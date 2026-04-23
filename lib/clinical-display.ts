type ClinicalFields = {
  chief_complaint?: string;
  medical_history?: string;
  current_medications?: string;
  vitals?: Record<string, string>;
  document_excerpt?: string;
};

type ModelResult = {
  predictions?: {
    disease: string;
    probability: number;
    icd11_code?: string;
  }[];
};

type ClinicalSummarySource = {
  complaint?: string;
  summary?: string;
  rawText?: string;
  clinicalFields?: ClinicalFields | null;
  modelResult?: ModelResult | null;
};

export type QueueClinicalSummary = {
  label: "Clinical summary" | "Model signal" | "Document loaded" | "Needs review";
  text: string;
};

export function normalizeClinicalSnippet(value?: string) {
  return (value || "")
    .replace(/^["']?\s*OCR extracted text from\s+[^:]+:\s*/i, "")
    .replace(/\bMedCoPilot\s+Clinical\s+Report\s*\d*\b/gi, "")
    .replace(/\bSynthetic\s+test\s+report\s*-\s*not\s+a\s+real\s+patient\b/gi, "")
    .replace(/\bSAMPLE\s+CLINICAL\s+REPORT\s*\d*\s*-\s*FOR\s+TESTING\s+ONLY\b/gi, "")
    .replace(/\bFOR\s+TESTING\s+OCR\s*\+\s*FIELD\s+EXTRACTION\s+ONLY\s*-\s*NOT\s+A\s+REAL\s+PATIENT\b/gi, "")
    .replace(/\bNot\s+a\s+real\s+patient\s+record\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLikelyDocumentDump(value?: string) {
  const cleaned = normalizeClinicalSnippet(value);
  if (!cleaned) return false;

  const upper = cleaned.toUpperCase();
  const administrativeHits = [
    "DEPARTMENT",
    "DIVISION",
    "TAXATION",
    "REVENUE",
    "MOTOR VEHICLE",
    "APPLICATION",
  ].filter((keyword) => upper.includes(keyword)).length;

  return (
    /^["']?\s*OCR extracted text from/i.test(value || "") ||
    administrativeHits >= 2 ||
    (cleaned.length > 220 && upper.includes("REPORT"))
  );
}

function truncateSummary(value: string, maxLength = 170) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export function buildQueueClinicalSummary(source: ClinicalSummarySource): QueueClinicalSummary {
  const clinicalComplaint = normalizeClinicalSnippet(source.clinicalFields?.chief_complaint);

  if (clinicalComplaint && !isLikelyDocumentDump(clinicalComplaint)) {
    return { label: "Clinical summary", text: truncateSummary(clinicalComplaint) };
  }

  const storedComplaint = normalizeClinicalSnippet(source.complaint || source.summary);
  if (storedComplaint && !isLikelyDocumentDump(source.complaint || source.summary)) {
    return { label: "Clinical summary", text: truncateSummary(storedComplaint) };
  }

  const modelSignal = source.modelResult?.predictions?.[0]?.disease;
  if (modelSignal) {
    return { label: "Model signal", text: modelSignal };
  }

  const documentText = normalizeClinicalSnippet(
    source.clinicalFields?.document_excerpt ||
      source.rawText ||
      source.summary ||
      source.complaint
  );

  if (documentText) {
    return {
      label: "Document loaded",
      text: truncateSummary(documentText),
    };
  }

  return {
    label: "Needs review",
    text: "No clinical complaint extracted yet. Open consultation to review the document.",
  };
}
