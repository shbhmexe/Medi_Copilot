import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from "@/lib/response";
import { createPatientSchema, updatePatientSchema, createVisitSchema } from "@/lib/validators";

// GET /api/patients
export async function getPatients(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const per_page = parseInt(searchParams.get("per_page") || "20");
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * per_page;

  let query = supabaseAdmin
    .from("patients")
    .select("*", { count: "exact" })
    .eq("clinic_id", user.clinic_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return serverErrorResponse(error);

  return successResponse(data, { total: count || 0, page, per_page });
}

// POST /api/patients
export async function createPatient(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid patient payload");

  const { data, error } = await supabaseAdmin
    .from("patients")
    .insert({ ...parsed.data, clinic_id: user.clinic_id })
    .select()
    .single();

  if (error) return serverErrorResponse(error);

  // Audit log
  await supabaseAdmin.from("audit_logs").insert({
    clinic_id: user.clinic_id, user_id: user.id, action: "CREATE_PATIENT",
    entity_type: "patient", entity_id: data.id, metadata: { patient_name: data.name },
  });

  return successResponse(data, undefined, 201);
}

// GET /api/patients/:id
export async function getPatient(req: NextRequest, id: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", user.clinic_id)
    .single();

  if (error || !data) return notFoundResponse("Patient");
  return successResponse(data);
}

// PUT /api/patients/:id
export async function updatePatient(req: NextRequest, id: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid patient update payload");

  const { data, error } = await supabaseAdmin
    .from("patients")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", user.clinic_id)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Patient");
  return successResponse(data);
}

// GET /api/patients/:id/visits
export async function getPatientVisits(req: NextRequest, patientId: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from("visits")
    .select("*, vitals(*), symptoms(*), diagnoses(*), medications(*), soap_notes(*)")
    .eq("patient_id", patientId)
    .eq("clinic_id", user.clinic_id)
    .order("created_at", { ascending: false });

  if (error) return serverErrorResponse(error);
  return successResponse(data || []);
}

// POST /api/patients/:id/visits
export async function createVisit(req: NextRequest, patientId: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const parsed = createVisitSchema.safeParse(body);
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid visit payload");

  // Verify patient belongs to clinic
  const { data: patient } = await supabaseAdmin.from("patients").select("id").eq("id", patientId).eq("clinic_id", user.clinic_id).single();
  if (!patient) return notFoundResponse("Patient");

  const { data, error } = await supabaseAdmin
    .from("visits")
    .insert({
      patient_id: patientId,
      clinic_id: user.clinic_id,
      doctor_id: user.id,
      chief_complaint: parsed.data.chief_complaint,
      status: "waiting",
      started_at: new Date().toISOString(),
    })
    .select("*, patients(*)")
    .single();

  if (error) return serverErrorResponse(error);

  await supabaseAdmin.from("audit_logs").insert({
    clinic_id: user.clinic_id, user_id: user.id, action: "CREATE_VISIT",
    entity_type: "visit", entity_id: data.id, metadata: {},
  });

  return successResponse(data, undefined, 201);
}

// GET /api/visits/:id
export async function getVisit(req: NextRequest, visitId: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from("visits")
    .select(`*, patients(*), vitals(*), symptoms(*), diagnoses(*), medications(*), soap_notes(*), lab_reports(*), drug_interactions(*)`)
    .eq("id", visitId)
    .eq("clinic_id", user.clinic_id)
    .single();

  if (error || !data) return notFoundResponse("Visit");
  return successResponse(data);
}

// POST /api/visits/:id/vitals
export async function recordVitals(req: NextRequest, visitId: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("vitals")
    .upsert({ ...body, visit_id: visitId, recorded_at: new Date().toISOString() }, { onConflict: "visit_id" })
    .select()
    .single();

  if (error) return serverErrorResponse(error);
  return successResponse(data, undefined, 201);
}

// POST /api/visits/:id/symptoms
export async function addSymptom(req: NextRequest, visitId: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("symptoms")
    .insert({ ...body, visit_id: visitId, recorded_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return serverErrorResponse(error);
  return successResponse(data, undefined, 201);
}

// POST /api/visits/:id/medications
export async function addMedication(req: NextRequest, visitId: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("medications")
    .insert({ ...body, visit_id: visitId, prescribed_by_ai: body.prescribed_by_ai || false, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return serverErrorResponse(error);
  return successResponse(data, undefined, 201);
}

// PATCH /api/visits/:id/status
export async function updateVisitStatus(req: NextRequest, visitId: string) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const updateData: Record<string, unknown> = { status: body.status };
  if (body.status === "completed") updateData.ended_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("visits")
    .update(updateData)
    .eq("id", visitId)
    .eq("clinic_id", user.clinic_id)
    .select()
    .single();

  if (error || !data) return notFoundResponse("Visit");
  return successResponse(data);
}
