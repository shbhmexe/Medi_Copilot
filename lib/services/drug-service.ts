import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/response";
import { drugCheckSchema } from "@/lib/validators";

const PYTHON_AI_SERVICE_URL = process.env.AI_INFERENCE_SERVICE_URL || "http://localhost:8000";

type DrugInteractionResult = {
  drug_a: string;
  drug_b: string;
  severity: "major" | "moderate" | "low";
  mechanism: string;
  clinical_significance: string;
  alternative_suggested: string | null;
};

type FallbackInteractionSeed = DrugInteractionResult;

const FALLBACK_DRUGS = [
  "Amlodipine",
  "Amiodarone",
  "Amoxicillin",
  "Amoxicillin/Clavulanate",
  "Aspirin",
  "Atorvastatin",
  "Azithromycin",
  "Cefixime",
  "Cetirizine",
  "Clarithromycin",
  "Diclofenac",
  "Digoxin",
  "Doxycycline",
  "Ibuprofen",
  "Lisinopril",
  "Losartan",
  "Metformin",
  "Metronidazole",
  "Omeprazole",
  "Ondansetron",
  "Oral rehydration solution",
  "Pantoprazole",
  "Paracetamol",
  "Rivaroxaban",
  "Simvastatin",
  "Spironolactone",
  "Sulfamethoxazole/Trimethoprim",
  "Warfarin",
] as const;

const DRUG_ALIASES: Record<string, string> = {
  acetaminophen: "Paracetamol",
  "co-trimoxazole": "Sulfamethoxazole/Trimethoprim",
  cotrimoxazole: "Sulfamethoxazole/Trimethoprim",
  ors: "Oral rehydration solution",
  "sulfamethoxazole trimethoprim": "Sulfamethoxazole/Trimethoprim",
  "trimethoprim sulfamethoxazole": "Sulfamethoxazole/Trimethoprim",
  "trimethoprim-sulfamethoxazole": "Sulfamethoxazole/Trimethoprim",
  "tmp-smx": "Sulfamethoxazole/Trimethoprim",
  zofran: "Ondansetron",
};

const CANONICAL_DRUG_MAP = Object.fromEntries(
  FALLBACK_DRUGS.map((drug) => [drug.toLowerCase(), drug])
) as Record<string, string>;

const FALLBACK_INTERACTION_SEEDS: FallbackInteractionSeed[] = [
  {
    drug_a: "Warfarin",
    drug_b: "Ibuprofen",
    severity: "major",
    mechanism: "Combined anticoagulant and NSAID exposure can substantially increase gastrointestinal and systemic bleeding risk.",
    clinical_significance: "Avoid together when possible. If unavoidable, monitor closely for bleeding and review the need for gastroprotection.",
    alternative_suggested: "Prefer paracetamol for analgesia if clinically appropriate.",
  },
  {
    drug_a: "Warfarin",
    drug_b: "Diclofenac",
    severity: "major",
    mechanism: "Diclofenac, like other NSAIDs, increases bleeding risk when combined with warfarin.",
    clinical_significance: "This is a high-risk combination and should only be used with strong clinical justification and close monitoring.",
    alternative_suggested: "Use a non-NSAID analgesic when feasible.",
  },
  {
    drug_a: "Warfarin",
    drug_b: "Metronidazole",
    severity: "major",
    mechanism: "Metronidazole can inhibit warfarin metabolism and raise anticoagulant exposure.",
    clinical_significance: "INR can rise substantially. Avoid routine co-prescribing or intensify INR monitoring if used together.",
    alternative_suggested: "Consider an alternative antimicrobial or adjust the anticoagulation plan with clinician oversight.",
  },
  {
    drug_a: "Warfarin",
    drug_b: "Sulfamethoxazole/Trimethoprim",
    severity: "major",
    mechanism: "Sulfamethoxazole/trimethoprim may prolong prothrombin time and potentiate warfarin effect.",
    clinical_significance: "Bleeding risk rises meaningfully; INR reassessment is required if this combination is used.",
    alternative_suggested: "Use a non-interacting antibiotic when clinically suitable or monitor INR closely.",
  },
  {
    drug_a: "Warfarin",
    drug_b: "Clarithromycin",
    severity: "moderate",
    mechanism: "Clarithromycin can potentiate oral anticoagulant effect and increase bleeding risk.",
    clinical_significance: "Prothrombin time and INR should be monitored closely if the combination is necessary.",
    alternative_suggested: "Consider a non-macrolide option when clinically appropriate.",
  },
  {
    drug_a: "Azithromycin",
    drug_b: "Ondansetron",
    severity: "major",
    mechanism: "Both agents can prolong the QT interval and increase torsades de pointes risk in susceptible patients.",
    clinical_significance: "Review cardiac history, electrolytes, and other QT-risk factors before co-prescribing.",
    alternative_suggested: "Choose a non-QT-prolonging antiemetic or antibiotic when feasible.",
  },
  {
    drug_a: "Ciprofloxacin",
    drug_b: "Ondansetron",
    severity: "major",
    mechanism: "Additive QT-prolonging effects may raise serious arrhythmia risk.",
    clinical_significance: "Use only when clearly necessary and consider ECG/electrolyte review in at-risk patients.",
    alternative_suggested: "Review the antibiotic choice or antiemetic alternative.",
  },
  {
    drug_a: "Ibuprofen",
    drug_b: "Aspirin",
    severity: "moderate",
    mechanism: "Ibuprofen can interfere with aspirin antiplatelet activity and add gastrointestinal toxicity.",
    clinical_significance: "Avoid routine concomitant use unless benefit clearly outweighs risk; timing separation may reduce but not remove risk.",
    alternative_suggested: "Consider paracetamol or a clinician-reviewed dosing strategy.",
  },
  {
    drug_a: "Ibuprofen",
    drug_b: "Lisinopril",
    severity: "moderate",
    mechanism: "NSAIDs may blunt the antihypertensive effect of ACE inhibitors and can worsen renal perfusion.",
    clinical_significance: "Monitor blood pressure and renal function if this combination is needed, especially during dehydration or chronic use.",
    alternative_suggested: "Prefer the shortest NSAID exposure possible or a non-NSAID analgesic.",
  },
  {
    drug_a: "Ibuprofen",
    drug_b: "Spironolactone",
    severity: "moderate",
    mechanism: "NSAID exposure can worsen renal function and complicate potassium handling during spironolactone therapy.",
    clinical_significance: "Check renal function and potassium if the combination cannot be avoided.",
    alternative_suggested: "Consider paracetamol or reduce NSAID exposure where clinically possible.",
  },
  {
    drug_a: "Spironolactone",
    drug_b: "Lisinopril",
    severity: "major",
    mechanism: "Combined potassium-sparing and renin-angiotensin system blockade increases hyperkalemia risk.",
    clinical_significance: "This combination requires potassium and renal-function monitoring and may be unsafe in higher-risk patients.",
    alternative_suggested: "Use only with a clear indication and structured electrolyte follow-up.",
  },
  {
    drug_a: "Spironolactone",
    drug_b: "Losartan",
    severity: "major",
    mechanism: "Spironolactone plus ARB therapy can significantly increase potassium and renal-risk burden.",
    clinical_significance: "Monitor potassium and creatinine closely and avoid unnecessary potassium supplementation.",
    alternative_suggested: "Consider whether dual RAAS/potassium-sparing therapy is truly indicated.",
  },
  {
    drug_a: "Amlodipine",
    drug_b: "Simvastatin",
    severity: "moderate",
    mechanism: "Amlodipine increases simvastatin exposure, which can raise myopathy risk.",
    clinical_significance: "Simvastatin dose should not exceed the recommended limit when co-administered with amlodipine.",
    alternative_suggested: "Reduce simvastatin exposure or consider another statin if clinically suitable.",
  },
  {
    drug_a: "Clarithromycin",
    drug_b: "Simvastatin",
    severity: "major",
    mechanism: "Clarithromycin is a strong CYP3A4 inhibitor and can markedly increase simvastatin exposure.",
    clinical_significance: "This combination is contraindicated because of high myopathy and rhabdomyolysis risk.",
    alternative_suggested: "Suspend simvastatin during clarithromycin therapy or choose a non-interacting antibiotic/statin plan.",
  },
  {
    drug_a: "Digoxin",
    drug_b: "Amiodarone",
    severity: "major",
    mechanism: "Amiodarone can substantially increase digoxin concentrations.",
    clinical_significance: "Digoxin levels and toxicity risk may rise quickly; dose reduction and monitoring are typically required.",
    alternative_suggested: "Reduce digoxin dose and monitor serum concentrations if co-administration is necessary.",
  },
  {
    drug_a: "Digoxin",
    drug_b: "Clarithromycin",
    severity: "moderate",
    mechanism: "Clarithromycin can increase digoxin exposure via P-glycoprotein inhibition.",
    clinical_significance: "Monitor for digoxin toxicity and consider serum-level monitoring during concomitant use.",
    alternative_suggested: "Prefer a non-interacting antibiotic when feasible.",
  },
  {
    drug_a: "Digoxin",
    drug_b: "Atorvastatin",
    severity: "moderate",
    mechanism: "Atorvastatin can modestly increase digoxin exposure.",
    clinical_significance: "Usually manageable, but digoxin has a narrow therapeutic index and may need closer monitoring.",
    alternative_suggested: "Continue with serum digoxin review if symptoms or high-risk features are present.",
  },
  {
    drug_a: "Rivaroxaban",
    drug_b: "Ibuprofen",
    severity: "major",
    mechanism: "Rivaroxaban plus NSAID therapy increases bleeding risk through combined hemostatic impairment.",
    clinical_significance: "Avoid routine combination unless clearly indicated and bleeding risk is acceptable.",
    alternative_suggested: "Consider paracetamol instead of an NSAID when appropriate.",
  },
  {
    drug_a: "Rivaroxaban",
    drug_b: "Aspirin",
    severity: "moderate",
    mechanism: "Aspirin adds antiplatelet effect and increases bleeding risk during rivaroxaban therapy.",
    clinical_significance: "This may be intentional in some cardiovascular indications, but bleeding risk still rises and must be justified.",
    alternative_suggested: "Use only when the indication for dual pathway inhibition is clear and actively monitored.",
  },
];

function buildServiceUrl(path: string) {
  return `${PYTHON_AI_SERVICE_URL}${path}`;
}

function canonicalizeDrugName(drug: string) {
  const cleaned = drug.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const lowered = cleaned.toLowerCase();
  return DRUG_ALIASES[lowered] || CANONICAL_DRUG_MAP[lowered] || cleaned;
}

function normalizeDrugList(drugs: string[]) {
  const seen = new Set<string>();
  return drugs
    .map((drug) => canonicalizeDrugName(drug))
    .filter((drug) => {
      if (!drug) return false;
      const key = drug.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildFallbackInteractions(drugs: string[]): DrugInteractionResult[] {
  const normalized = new Map(drugs.map((drug) => [drug.toLowerCase(), drug] as const));
  return FALLBACK_INTERACTION_SEEDS.filter(
    (seed) => normalized.has(seed.drug_a.toLowerCase()) && normalized.has(seed.drug_b.toLowerCase())
  ).map((seed) => ({
    ...seed,
    drug_a: normalized.get(seed.drug_a.toLowerCase())!,
    drug_b: normalized.get(seed.drug_b.toLowerCase())!,
  }));
}

function buildFallbackPayload(drugs: string[]) {
  const interactions = buildFallbackInteractions(drugs);
  const pairCount = (drugs.length * (drugs.length - 1)) / 2;

  return {
    drugs_checked: drugs,
    pairs_analyzed: pairCount,
    interactions,
    safe_combinations: Math.max(pairCount - interactions.length, 0),
    source: "fallback" as const,
    neo4j_connected: false,
  };
}

// POST /api/drugs/check
export async function checkDrugInteractions(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const parsed = drugCheckSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid drug check payload");
  }

  const drugs = normalizeDrugList(parsed.data.drugs);

  try {
    const response = await fetch(buildServiceUrl("/ai/drugs/check"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ drugs }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      return successResponse(buildFallbackPayload(drugs));
    }

    return successResponse(payload.data);
  } catch {
    return successResponse(buildFallbackPayload(drugs));
  }
}

// GET /api/drugs/search?q=
export async function searchDrugs(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) return successResponse([]);

  try {
    const response = await fetch(
      buildServiceUrl(`/ai/drugs/search?q=${encodeURIComponent(q)}&limit=10`),
      { cache: "no-store" }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success || !Array.isArray(payload?.data)) {
      throw new Error(typeof payload?.detail === "string" ? payload.detail : "Drug catalog search failed");
    }

    return successResponse(payload.data);
  } catch {
    const query = q.toLowerCase();
    const seen = new Set<string>();
    const fallbackResults = [...FALLBACK_DRUGS, ...Object.keys(DRUG_ALIASES)]
      .map((term) => ({ term, canonical: canonicalizeDrugName(term) }))
      .filter(({ term, canonical }) => {
        if (!term.toLowerCase().includes(query) && !canonical.toLowerCase().includes(query)) return false;
        const key = canonical.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ canonical }) => canonical)
      .slice(0, 10);
    return successResponse(fallbackResults);
  }
}
