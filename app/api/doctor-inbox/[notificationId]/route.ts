import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import {
  deleteDoctorInboxItem,
  updateDoctorInboxItem,
} from "@/lib/doctor-inbox-file";
import {
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();

  if (!requireRole(user, "doctor", "admin")) {
    return forbiddenResponse();
  }

  const { notificationId } = await params;

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const nextStatus = payload.status === "added" ? "added" : undefined;
    const nextIsRead = typeof payload.isRead === "boolean" ? payload.isRead : undefined;

    const updatedItem = await updateDoctorInboxItem(notificationId, {
      status: nextStatus,
      isRead: nextIsRead,
    });

    if (!updatedItem) {
      return notFoundResponse("Doctor notification");
    }

    return successResponse(updatedItem);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update notification";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await params;
  const deleted = await deleteDoctorInboxItem(notificationId);

  if (!deleted) {
    return notFoundResponse("Doctor notification");
  }

  return successResponse({ ok: true });
}
