import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { createAccessToken, createRefreshToken, setAuthCookies, getUserFromRequest, verifyRefreshToken } from "@/lib/auth";
import { buildMockAdminUser, buildMockDoctorUser, buildMockPatientUser } from "@/lib/mock-users";
import { loginSchema, registerSchema } from "@/lib/validators";
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/response";
import type { AuthUser } from "@/types";

// POST /api/auth/login
export async function login(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid login payload");

    const { email, password } = parsed.data;

    // --- Developer Mock Mode ByPass ---
    // If the email is the demo admin, bypass Supabase entirely since it's not running
    if (email.toLowerCase() === "admin@medcopilot.com" && password === "password") {
      const mockUser = buildMockAdminUser();
      
      const accessToken = await createAccessToken(mockUser);
      const refreshToken = await createRefreshToken(mockUser.id);
      
      const cookies = setAuthCookies(accessToken, refreshToken);
      const response = successResponse({ user: mockUser, access_token: accessToken }, undefined, 200);
      response.cookies.set(cookies.accessToken);
      response.cookies.set(cookies.refreshToken);
      return response;
    }

    if (email.toLowerCase() === "user@medcopilot.com" && password === "password") {
      const mockUser = buildMockPatientUser();

      const accessToken = await createAccessToken(mockUser);
      const refreshToken = await createRefreshToken(mockUser.id);

      const cookies = setAuthCookies(accessToken, refreshToken);
      const response = successResponse({ user: mockUser, access_token: accessToken }, undefined, 200);
      response.cookies.set(cookies.accessToken);
      response.cookies.set(cookies.refreshToken);
      return response;
    }

    if (email.toLowerCase() === "doctor@medcopilot.com" && password === "password") {
      const mockUser = buildMockDoctorUser();

      const accessToken = await createAccessToken(mockUser);
      const refreshToken = await createRefreshToken(mockUser.id);

      const cookies = setAuthCookies(accessToken, refreshToken);
      const response = successResponse({ user: mockUser, access_token: accessToken }, undefined, 200);
      response.cookies.set(cookies.accessToken);
      response.cookies.set(cookies.refreshToken);
      return response;
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*, clinics(name, subscription_tier)")
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .single();

    if (error || !user) return errorResponse("INVALID_CREDENTIALS", "Invalid email or password", 401);

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return errorResponse("INVALID_CREDENTIALS", "Invalid email or password", 401);

    // Update last login
    await supabaseAdmin.from("users").update({ last_login: new Date().toISOString() }).eq("id", user.id);

    const authUser = { id: user.id, clinic_id: user.clinic_id, name: user.name, email: user.email, role: user.role, specialty: user.specialty };
    const accessToken = await createAccessToken(authUser);
    const refreshToken = await createRefreshToken(user.id);

    // Store refresh token in DB
    await supabaseAdmin.from("refresh_tokens").insert({ user_id: user.id, token: refreshToken, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });

    const cookies = setAuthCookies(accessToken, refreshToken);
    const response = successResponse({ user: authUser, access_token: accessToken }, undefined, 200);
    response.cookies.set(cookies.accessToken);
    response.cookies.set(cookies.refreshToken);

    return response;
  } catch (err) {
    return serverErrorResponse(err);
  }
}

// POST /api/auth/register
export async function register(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid registration payload");

    const { clinic_name, clinic_address, clinic_district, clinic_state, clinic_pincode, clinic_specialty, admin_name, admin_email, password } = parsed.data;

    // Check if email exists
    const { data: existing } = await supabaseAdmin.from("users").select("id").eq("email", admin_email.toLowerCase()).single();
    if (existing) return errorResponse("EMAIL_EXISTS", "An account with this email already exists", 409);

    // Create clinic
    const { data: clinic, error: clinicError } = await supabaseAdmin.from("clinics").insert({
      name: clinic_name, address: clinic_address, district: clinic_district,
      state: clinic_state, pincode: clinic_pincode, specialty: clinic_specialty,
      subscription_tier: "free", is_active: true,
    }).select().single();

    if (clinicError || !clinic) return serverErrorResponse(clinicError);

    // Hash password and create admin user
    const password_hash = await bcrypt.hash(password, 12);
    const { data: user, error: userError } = await supabaseAdmin.from("users").insert({
      clinic_id: clinic.id, name: admin_name, email: admin_email.toLowerCase(),
      password_hash, role: "admin", is_active: true,
    }).select().single();

    if (userError || !user) return serverErrorResponse(userError);

    const authUser = { id: user.id, clinic_id: clinic.id, name: user.name, email: user.email, role: user.role };
    const accessToken = await createAccessToken(authUser);
    const refreshToken = await createRefreshToken(user.id);
    await supabaseAdmin.from("refresh_tokens").insert({ user_id: user.id, token: refreshToken, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });

    const cookies = setAuthCookies(accessToken, refreshToken);
    const response = successResponse({ user: authUser, access_token: accessToken, clinic }, undefined, 201);
    response.cookies.set(cookies.accessToken);
    response.cookies.set(cookies.refreshToken);
    return response;
  } catch (err) {
    return serverErrorResponse(err);
  }
}

// POST /api/auth/refresh
export async function refresh(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get("refresh_token")?.value;
    const body = await req.json().catch(() => ({}));
    const token = cookieToken || body.refresh_token;

    if (!token) return unauthorizedResponse();

    // Lookup refresh token in DB
    const { data: rt } = await supabaseAdmin.from("refresh_tokens").select("*, users(*)").eq("token", token).eq("revoked", false).single();

    if (!rt || !rt.users) {
      const refreshPayload = await verifyRefreshToken(token);
      if (refreshPayload?.userId === buildMockAdminUser().id) {
        const mockUser = buildMockAdminUser();
        const newAccessToken = await createAccessToken(mockUser);
        const newRefreshToken = await createRefreshToken(mockUser.id);
        const cookies = setAuthCookies(newAccessToken, newRefreshToken);
        const response = successResponse({ access_token: newAccessToken });
        response.cookies.set(cookies.accessToken);
        response.cookies.set(cookies.refreshToken);
        return response;
      }

      if (refreshPayload?.userId === buildMockPatientUser().id) {
        const mockUser = buildMockPatientUser();
        const newAccessToken = await createAccessToken(mockUser);
        const newRefreshToken = await createRefreshToken(mockUser.id);
        const cookies = setAuthCookies(newAccessToken, newRefreshToken);
        const response = successResponse({ access_token: newAccessToken });
        response.cookies.set(cookies.accessToken);
        response.cookies.set(cookies.refreshToken);
        return response;
      }

      if (refreshPayload?.userId === buildMockDoctorUser().id) {
        const mockUser = buildMockDoctorUser();
        const newAccessToken = await createAccessToken(mockUser);
        const newRefreshToken = await createRefreshToken(mockUser.id);
        const cookies = setAuthCookies(newAccessToken, newRefreshToken);
        const response = successResponse({ access_token: newAccessToken });
        response.cookies.set(cookies.accessToken);
        response.cookies.set(cookies.refreshToken);
        return response;
      }

      return unauthorizedResponse();
    }

    const user = rt.users as AuthUser;
    const authUser: AuthUser = { id: user.id, clinic_id: user.clinic_id, name: user.name, email: user.email, role: user.role, specialty: user.specialty };
    const newAccessToken = await createAccessToken(authUser);
    const newRefreshToken = await createRefreshToken(user.id);

    // Rotate refresh token
    await supabaseAdmin.from("refresh_tokens").update({ revoked: true }).eq("token", token);
    await supabaseAdmin.from("refresh_tokens").insert({ user_id: user.id, token: newRefreshToken, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });

    const cookies = setAuthCookies(newAccessToken, newRefreshToken);
    const response = successResponse({ access_token: newAccessToken });
    response.cookies.set(cookies.accessToken);
    response.cookies.set(cookies.refreshToken);
    return response;
  } catch (err) {
    return serverErrorResponse(err);
  }
}

// POST /api/auth/logout
export async function logout(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    await supabaseAdmin.from("refresh_tokens").update({ revoked: true }).eq("token", refreshToken);
  }
  const res = successResponse({ message: "Logged out successfully" });
  res.cookies?.delete?.("access_token");
  res.cookies?.delete?.("refresh_token");
  return res;
}

// GET /api/auth/me
export async function me(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorizedResponse();
  const { data } = await supabaseAdmin.from("users").select("*, clinics(*)").eq("id", user.id).single();
  return successResponse(data || user);
}
