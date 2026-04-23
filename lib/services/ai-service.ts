import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";
import { anthropic, CLAUDE_MODEL, DIAGNOSIS_SYSTEM_PROMPT, SOAP_SYSTEM_PROMPT, sseEvent } from "@/lib/ai";
import { unauthorizedResponse, errorResponse, serverErrorResponse } from "@/lib/response";

// POST /api/ai/analyze — SSE streaming differential diagnosis
export async function analyzeVisit(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { visit_id } = await req.json();
  if (!visit_id) return errorResponse("VALIDATION_ERROR", "visit_id is required");

  // Fetch full visit data
  const { data: visit, error } = await supabaseAdmin
    .from("visits")
    .select(`*, patients(*), vitals(*), symptoms(*), medications(*), lab_reports(*), diagnoses(*)`)
    .eq("id", visit_id)
    .eq("clinic_id", user.clinic_id)
    .single();

  if (error || !visit) return errorResponse("NOT_FOUND", "Visit not found", 404);

  const patient = visit.patients as any;
  const vitals = visit.vitals?.[0] as any;
  const symptoms = visit.symptoms as any[];
  const medications = visit.medications as any[];
  const labReports = visit.lab_reports as any[];

  const clinicalContext = `
PATIENT: ${patient?.name}, Age: ${patient?.age}, Gender: ${patient?.gender}, Blood Group: ${patient?.blood_group || "Unknown"}
ALLERGIES: ${patient?.allergies?.join(", ") || "None known"}
CHIEF COMPLAINT: ${visit.chief_complaint || "Not specified"}

VITALS: BP ${vitals?.bp_systolic || "--"}/${vitals?.bp_diastolic || "--"} mmHg | Pulse ${vitals?.pulse || "--"} bpm | Temp ${vitals?.temperature || "--"}°F | SpO2 ${vitals?.spo2 || "--"}% | Weight ${vitals?.weight || "--"} kg | RBS ${vitals?.rbs || "--"} mg/dL

SYMPTOMS: ${symptoms?.map((s: any) => `${s.description} (${s.duration || "unspecified"}, severity ${s.severity || "?"}/10)`).join("; ") || "None recorded"}

CURRENT MEDICATIONS: ${medications?.map((m: any) => `${m.drug_name} ${m.dosage || ""} ${m.frequency || ""}`).join(", ") || "None"}

LAB REPORTS: ${labReports?.length ? `${labReports.length} report(s) uploaded. Extracted values: ${JSON.stringify(labReports.map((r: any) => r.extracted_values).filter(Boolean))}` : "None uploaded"}
`;

  const prompt = `Based on this clinical data, provide a differential diagnosis:

${clinicalContext}

Return a JSON array of 3-5 diagnoses, each with:
{
  "diagnosis_name": string,
  "icd11_code": string,
  "probability_score": number (0-100),
  "confidence_level": "high"|"medium"|"low",
  "reasoning": string (2-3 sentences citing specific findings),
  "is_primary": boolean (only one true),
  "tags": ["URGENT"|"CHRONIC"|"RULE OUT"|"LIKELY"]
}

Also return drug interactions for: ${medications?.map((m: any) => m.drug_name).join(", ") || "no current medications"}.

Format: { "diagnoses": [...], "interactions": [...] }`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Thinking
        controller.enqueue(encoder.encode(sseEvent("thinking", { message: "Analyzing patient vitals and symptoms...", step: 1 })));
        await new Promise(r => setTimeout(r, 300));
        controller.enqueue(encoder.encode(sseEvent("thinking", { message: "Cross-referencing medical knowledge base...", step: 2 })));
        await new Promise(r => setTimeout(r, 400));
        controller.enqueue(encoder.encode(sseEvent("thinking", { message: "Computing differential probabilities...", step: 3 })));

        // Step 2: Call Claude
        const message = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          system: DIAGNOSIS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        const content = message.content[0];
        if (content.type !== "text") throw new Error("Unexpected response type");

        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");

        const result = JSON.parse(jsonMatch[0]);
        const diagnoses = result.diagnoses || [];
        const interactions = result.interactions || [];

        // Step 3: Stream diagnosis cards
        for (const diagnosis of diagnoses) {
          await new Promise(r => setTimeout(r, 150));
          
          // Save to DB
          const { data: savedDiag } = await supabaseAdmin.from("diagnoses").insert({
            visit_id,
            clinic_id: user.clinic_id,
            diagnosis_name: diagnosis.diagnosis_name,
            icd11_code: diagnosis.icd11_code,
            probability_score: diagnosis.probability_score / 100,
            confidence_level: diagnosis.confidence_level,
            reasoning: diagnosis.reasoning,
            is_primary: diagnosis.is_primary,
            generated_by_ai: true,
          }).select().single();

          controller.enqueue(encoder.encode(sseEvent("diagnosis_card", {
            ...diagnosis,
            id: savedDiag?.id || crypto.randomUUID(),
            visit_id,
          })));
        }

        // Step 4: Drug interactions
        if (interactions.length > 0) {
          for (const interaction of interactions) {
            await supabaseAdmin.from("drug_interactions").insert({
              visit_id,
              clinic_id: user.clinic_id,
              drug_a: interaction.drug_a,
              drug_b: interaction.drug_b,
              severity: interaction.severity,
              mechanism: interaction.mechanism,
              alternative_suggested: interaction.alternative,
            });
          }
          controller.enqueue(encoder.encode(sseEvent("interaction_check", interactions)));
        }

        // Audit log
        await supabaseAdmin.from("audit_logs").insert({
          clinic_id: user.clinic_id, user_id: user.id, action: "AI_ANALYSIS",
          entity_type: "visit", entity_id: visit_id,
          metadata: { diagnoses_count: diagnoses.length, interactions_count: interactions.length },
        });

        controller.enqueue(encoder.encode(sseEvent("complete", { visit_id, diagnoses_count: diagnoses.length })));
      } catch (err) {
        console.error("AI analyze error:", err);
        controller.enqueue(encoder.encode(sseEvent("error", { message: "AI analysis failed. Please try again." })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST /api/ai/soap — SSE streaming SOAP note generation
export async function generateSoap(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  const { visit_id } = await req.json();
  if (!visit_id) return errorResponse("VALIDATION_ERROR", "visit_id is required");

  const { data: visit } = await supabaseAdmin
    .from("visits")
    .select(`*, patients(*), vitals(*), symptoms(*), diagnoses(*), medications(*)`)
    .eq("id", visit_id)
    .eq("clinic_id", user.clinic_id)
    .single();

  if (!visit) return errorResponse("NOT_FOUND", "Visit not found", 404);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(sseEvent("thinking", { message: "Generating SOAP note...", step: 1 })));

        const patient = visit.patients as any;
        const vitals = visit.vitals?.[0] as any;
        const symptoms = visit.symptoms as any[];
        const diagnoses = visit.diagnoses as any[];
        const medications = visit.medications as any[];

        const prompt = `Generate a comprehensive SOAP note for this visit:

Patient: ${patient?.name}, ${patient?.age}y/${patient?.gender}
Chief Complaint: ${visit.chief_complaint}
Symptoms: ${symptoms?.map((s: any) => s.description).join(", ")}
Vitals: BP ${vitals?.bp_systolic}/${vitals?.bp_diastolic}, Pulse ${vitals?.pulse}, Temp ${vitals?.temperature}°F, SpO2 ${vitals?.spo2}%
Primary Diagnosis: ${diagnoses?.find((d: any) => d.is_primary)?.diagnosis_name || "Under evaluation"}
All Diagnoses: ${diagnoses?.map((d: any) => `${d.diagnosis_name} (${Math.round((d.probability_score || 0) * 100)}%)`).join(", ")}
Medications: ${medications?.map((m: any) => `${m.drug_name} ${m.dosage}`).join(", ")}

Return JSON: { "subjective": "...", "objective": "...", "assessment": "...", "plan": "..." }`;

        const message = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1500,
          system: SOAP_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const soapData = jsonMatch ? JSON.parse(jsonMatch[0]) : { subjective: text, objective: "", assessment: "", plan: "" };

        const fields = ["subjective", "objective", "assessment", "plan"] as const;
        for (const field of fields) {
          await new Promise(r => setTimeout(r, 200));
          controller.enqueue(encoder.encode(sseEvent("soap_field", { field, content: soapData[field] || "" })));
        }

        // Save to DB
        await supabaseAdmin.from("soap_notes").upsert({
          visit_id,
          subjective: soapData.subjective || "",
          objective: soapData.objective || "",
          assessment: soapData.assessment || "",
          plan: soapData.plan || "",
          generated_by_ai: true,
        }, { onConflict: "visit_id" });

        controller.enqueue(encoder.encode(sseEvent("complete", { visit_id })));
      } catch (err) {
        controller.enqueue(encoder.encode(sseEvent("error", { message: "SOAP generation failed." })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
