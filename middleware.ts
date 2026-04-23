import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/refresh"];
const PUBLIC_API_PREFIXES = ["/api/ai/", "/api/patient-pass"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow AI proxy routes used by onboarding/analysis flows
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static and Next.js internal
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/") {
    return NextResponse.next();
  }

  // Check auth for protected routes
  const token = req.cookies.get("access_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }
    return NextResponse.next(); // Let client-side layout check local storage
  }

  const user = await verifyToken(token).catch(() => null);
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }, { status: 401 });
    }
    return NextResponse.next(); // Let client-side layout check local storage
  }

  // Forward user info in headers for API routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-clinic-id", user.clinic_id);
  requestHeaders.set("x-user-role", user.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
