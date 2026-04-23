import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";
import { successResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/response";

// GET /api/analytics/overview
export async function getOverview(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const clinicId = user.clinic_id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [patients, visits, interactions, diagnoses, lastMonthPatients] = await Promise.all([
    supabaseAdmin.from("patients").select("id", { count: "exact" }).eq("clinic_id", clinicId),
    supabaseAdmin.from("visits").select("id", { count: "exact" }).eq("clinic_id", clinicId).gte("created_at", startOfMonth),
    supabaseAdmin.from("drug_interactions").select("id", { count: "exact" }).eq("clinic_id", clinicId).gte("created_at", startOfMonth),
    supabaseAdmin.from("diagnoses").select("probability_score").eq("clinic_id", clinicId).eq("generated_by_ai", true).gte("created_at", startOfMonth),
    supabaseAdmin.from("patients").select("id", { count: "exact" }).eq("clinic_id", clinicId).gte("created_at", startOfLastMonth).lt("created_at", startOfMonth),
  ]);

  const avgConfidence = diagnoses.data?.length
    ? diagnoses.data.reduce((sum, d) => sum + (d.probability_score || 0), 0) / diagnoses.data.length
    : 0;
  const totalPatients = patients.count || 0;
  const previousMonthPatients = lastMonthPatients.count || 0;

  return successResponse({
    total_patients: totalPatients,
    ai_analyses_run: visits.count ? visits.count * 2 : 0,
    drug_interactions_flagged: interactions.count || 0,
    avg_confidence: Math.round(avgConfidence * 10) / 10,
    patients_change: previousMonthPatients ? (((totalPatients - previousMonthPatients) / previousMonthPatients) * 100) : 0,
    analyses_change: 0,
    interactions_change: 0,
  });
}

// GET /api/analytics/daily-volume
export async function getDailyVolume(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("visits")
    .select("created_at")
    .eq("clinic_id", user.clinic_id)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at");

  if (error) return serverErrorResponse(error);

  // Group by date
  const volumeMap: Record<string, number> = {};
  (data || []).forEach((v) => {
    const date = v.created_at.split("T")[0];
    volumeMap[date] = (volumeMap[date] || 0) + 1;
  });

  // Fill last 30 days
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    result.push({ date: dateStr, patients: volumeMap[dateStr] || 0, visits: volumeMap[dateStr] || 0 });
  }

  return successResponse(result);
}

// GET /api/analytics/diagnosis-distribution
export async function getDiagnosisDistribution(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from("diagnoses")
    .select("diagnosis_name")
    .eq("clinic_id", user.clinic_id)
    .eq("is_primary", true);

  if (error) return serverErrorResponse(error);

  const COLORS = ["#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];
  const diagnosisMap: Record<string, number> = {};
  (data || []).forEach((diagnosis) => {
    const name = diagnosis.diagnosis_name || "Unspecified";
    diagnosisMap[name] = (diagnosisMap[name] || 0) + 1;
  });

  const distribution = Object.entries(diagnosisMap).map(([name, value], i) => ({
    name,
    value,
    color: COLORS[i % COLORS.length],
  }));

  return successResponse(distribution);
}

// GET /api/analytics/top-interactions
export async function getTopInteractions(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data, error } = await supabaseAdmin
    .from("drug_interactions")
    .select("drug_a, drug_b, severity")
    .eq("clinic_id", user.clinic_id)
    .gte("created_at", startOfMonth);

  if (error) return serverErrorResponse(error);

  // Count pairs
  const pairMap: Record<string, { count: number; severity: string }> = {};
  (data || []).forEach((d) => {
    const key = [d.drug_a, d.drug_b].sort().join("|");
    pairMap[key] = { count: (pairMap[key]?.count || 0) + 1, severity: d.severity };
  });

  const topInteractions = Object.entries(pairMap)
    .map(([key, val]) => { const [drug_a, drug_b] = key.split("|"); return { drug_a, drug_b, ...val }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return successResponse(topInteractions);
}

// GET /api/analytics/outbreak-signals
export async function getOutbreakSignals(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const signals: {
    district: string;
    state: string;
    symptom: string;
    case_count: number;
    trend: string;
    severity: string;
  }[] = [];

  return successResponse(signals);
}
