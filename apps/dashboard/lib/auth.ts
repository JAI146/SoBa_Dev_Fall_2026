import type { AuthResponse } from "@purposemint/contracts";

const TOKEN_KEY = "purposemint_access_token";
const USER_KEY = "purposemint_user";
const REMEMBER_KEY = "purposemint_remember_session";
const REMEMBERED_EMAIL_KEY = "purposemint_remembered_email";

export type StoredUser = AuthResponse["user"];

function readStorageValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export function getToken(): string | null {
  return readStorageValue(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = readStorageValue(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function saveAuth(data: AuthResponse, rememberSession: boolean): void {
  if (typeof window === "undefined") return;
  clearAuth();
  const storage = rememberSession ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, data.accessToken);
  storage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken() && getStoredUser());
}

export function setRememberMePreference(
  rememberSession: boolean,
  email?: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_KEY, String(rememberSession));
  if (rememberSession && email) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
  } else {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }
}

export function getRememberMePreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
}

export function getDashboardPath(): string {
  return "/dashboard";
}
