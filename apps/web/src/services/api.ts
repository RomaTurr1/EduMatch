import type { AuthPayload } from "../types/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

let accessToken = localStorage.getItem("edumatch.accessToken") ?? "";
let refreshToken = localStorage.getItem("edumatch.refreshToken") ?? "";

export function getAccessToken() {
  return accessToken;
}

export function setAuth(payload: AuthPayload) {
  accessToken = payload.accessToken;
  refreshToken = payload.refreshToken;
  localStorage.setItem("edumatch.accessToken", accessToken);
  localStorage.setItem("edumatch.refreshToken", refreshToken);
}

export function clearAuth() {
  accessToken = "";
  refreshToken = "";
  localStorage.removeItem("edumatch.accessToken");
  localStorage.removeItem("edumatch.refreshToken");
}

async function refreshAccessToken() {
  if (!refreshToken) throw new Error("No refresh token");
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) throw new Error("Session expired");
  const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem("edumatch.accessToken", accessToken);
  localStorage.setItem("edumatch.refreshToken", refreshToken);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && refreshToken) {
    await refreshAccessToken();
    headers.set("Authorization", `Bearer ${accessToken}`);
    const retry = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!retry.ok) throw new Error(await readError(retry));
    return retry.status === 204 ? (undefined as T) : retry.json();
  }

  if (!response.ok) throw new Error(await readError(response));
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function apiFormData<T>(path: string, formData: FormData): Promise<T> {
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData
  });

  if (response.status === 401 && refreshToken) {
    await refreshAccessToken();
    headers.set("Authorization", `Bearer ${accessToken}`);
    const retry = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData
    });
    if (!retry.ok) throw new Error(await readError(retry));
    return retry.json();
  }

  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export async function signout() {
  if (refreshToken) {
    await api<void>("/auth/signout", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    }).catch(() => undefined);
  }
  clearAuth();
}
