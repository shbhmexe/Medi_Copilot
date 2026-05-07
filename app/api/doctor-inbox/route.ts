import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import {
  createDoctorInboxItem,
  listDoctorInboxItems,
  markAllDoctorInboxItemsRead,
} from "@/lib/doctor-inbox-file";
import { forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";

export const dynamic = "force-dynamic";

function getAllowedBookingOrigins() {
  const configured = [
    process.env.PATIENT_APP_URL,
    process.env.NEXT_PUBLIC_PATIENT_APP_URL,
    process.env.CORS_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return new Set([
    ...configured,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ]);
}

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin")?.replace(/\/$/, "");
  const allowedOrigins = getAllowedBookingOrigins();
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  if (!requireRole(user, "doctor", "admin")) {
    return forbiddenResponse();
  }

  const items = await listDoctorInboxItems(user.id);
  return successResponse(items);
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  try {
    const payload = (await req.json()) as Record<string, unknown>;

    const requiredStringFields = [
      "doctorId",
      "doctorName",
      "bookingId",
      "patientCode",
      "patientName",
      "patientGender",
      "message",
      "reason",
      "symptoms",
      "appointmentDate",
      "appointmentTime",
      "specialty",
      "hospitalName",
      "handoffRoute",
      "consultationRoute",
    ] as const;

    for (const field of requiredStringFields) {
      if (typeof payload[field] !== "string" || !payload[field].trim()) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400, headers }
        );
      }
    }

    if (typeof payload.patientAge !== "number" || Number.isNaN(payload.patientAge)) {
      return NextResponse.json(
        { success: false, error: "patientAge is required" },
        { status: 400, headers }
      );
    }

    if (!payload.patientRecord || typeof payload.patientRecord !== "object") {
      return NextResponse.json(
        { success: false, error: "patientRecord is required" },
        { status: 400, headers }
      );
    }

    const nextItem = await createDoctorInboxItem({
      doctorId: payload.doctorId as string,
      doctorName: payload.doctorName as string,
      clinicId: typeof payload.clinicId === "string" ? payload.clinicId : undefined,
      bookingId: payload.bookingId as string,
      patientCode: payload.patientCode as string,
      patientName: payload.patientName as string,
      patientAge: payload.patientAge as number,
      patientGender: payload.patientGender as string,
      message: payload.message as string,
      reason: payload.reason as string,
      symptoms: payload.symptoms as string,
      appointmentDate: payload.appointmentDate as string,
      appointmentTime: payload.appointmentTime as string,
      specialty: payload.specialty as string,
      hospitalName: payload.hospitalName as string,
      handoffRoute: payload.handoffRoute as string,
      consultationRoute: payload.consultationRoute as string,
      patientRecord: payload.patientRecord as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: nextItem }, { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create doctor notification";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  if (!requireRole(user, "doctor", "admin")) {
    return forbiddenResponse();
  }

  await markAllDoctorInboxItemsRead(user.id);
  return successResponse({ ok: true });
}
