"use client";

import type { AuthUser } from "@/types";

type AuthFetchContext = {
  accessToken: string | null;
  user: AuthUser | null;
  setUser: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
};

export async function runAuthorizedRequest(
  input: RequestInfo | URL,
  init: RequestInit,
  auth: AuthFetchContext
) {
  const buildHeaders = (token: string | null) => {
    const headers = new Headers(init.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  };

  const runRequest = (token: string | null) =>
    fetch(input, {
      ...init,
      credentials: init.credentials || "include",
      headers: buildHeaders(token),
    });

  let response = await runRequest(auth.accessToken);

  if (response.status === 401 && auth.user) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    const refreshData = await refreshResponse.json().catch(() => ({}));
    const refreshedToken =
      typeof refreshData?.data?.access_token === "string"
        ? refreshData.data.access_token
        : null;

    if (refreshResponse.ok && refreshedToken) {
      auth.setUser(auth.user, refreshedToken);
      response = await runRequest(refreshedToken);
    } else {
      auth.clearAuth();
    }
  }

  return response;
}
