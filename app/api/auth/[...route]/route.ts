import { NextRequest } from "next/server";
import { login, register, refresh, logout, me } from "@/lib/services/auth-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const action = route[0];

  switch (action) {
    case "login": return login(req);
    case "register": return register(req);
    case "refresh": return refresh(req);
    case "logout": return logout(req);
    default: return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, { status: 404 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const action = route[0];
  if (action === "me") return me(req);
  return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, { status: 404 });
}
