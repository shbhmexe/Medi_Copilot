import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { buildMockClinicianProfiles, isMockClinicId } from "@/lib/mock-users";
import { supabaseAdmin } from "@/lib/supabase";
import type { ClinicianProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  if (isMockClinicId(user.clinic_id) || user.id === "mock-user-uuid") {
    return NextResponse.json({ success: true, data: buildMockClinicianProfiles() });
  }

  try {
    const { data: clinicians, error } = await supabaseAdmin
      .from("users")
      .select("id, clinic_id, name, email, role, specialty")
      .eq("is_active", true)
      .eq("clinic_id", user.clinic_id)
      .in("role", ["doctor", "admin"])
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const clinicResponse = await supabaseAdmin
      .from("clinics")
      .select("name")
      .eq("id", user.clinic_id)
      .single();

    const clinicName = clinicResponse.data?.name || "Clinic";
    const items: ClinicianProfile[] = (clinicians || []).map((clinician) => ({
      id: clinician.id,
      clinic_id: clinician.clinic_id,
      clinic_name: clinicName,
      name: clinician.name,
      email: clinician.email,
      role: clinician.role,
      specialty: clinician.specialty || "General Medicine",
    }));

    if (items.length > 0) {
      return NextResponse.json({ success: true, data: items });
    }

    if (user.role === "doctor" || user.role === "admin") {
      const fallback: ClinicianProfile = {
        id: user.id,
        clinic_id: user.clinic_id,
        clinic_name: clinicName,
        name: user.name,
        email: user.email,
        role: user.role,
        specialty: user.specialty || "General Medicine",
      };

      return NextResponse.json({ success: true, data: [fallback] });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load doctors";
    return NextResponse.json(
      { success: false, error: { code: "DOCTOR_FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}
