import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { AuthUser } from "@/types";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

const JWT_SECRET = new TextEncoder().encode(jwtSecret);
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

type RefreshTokenPayload = {
  userId: string;
};

// ---- Token Creation ----
export async function createAccessToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    clinic_id: user.clinic_id,
    email: user.email,
    name: user.name,
    role: user.role,
    specialty: user.specialty,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// ---- Token Verification ----
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.sub as string,
      clinic_id: payload.clinic_id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as AuthUser["role"],
      specialty: payload.specialty as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "refresh" || typeof payload.sub !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
    };
  } catch {
    return null;
  }
}

// ---- Get current user from request ----
export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  // Try Authorization header first
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyToken(token);
  }
  // Try cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (token) return verifyToken(token);
  return null;
}

// ---- Cookie helpers ----
export function setAuthCookies(accessToken: string, refreshToken: string) {
  return {
    accessToken: {
      name: "access_token",
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 15 * 60, // 15 min
    },
    refreshToken: {
      name: "refresh_token",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  };
}

// ---- Role guard helper ----
export function requireRole(user: AuthUser | null, ...roles: AuthUser["role"][]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
