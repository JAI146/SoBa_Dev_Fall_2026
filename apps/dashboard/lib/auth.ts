"use client";

import type { AuthResponse } from "@muakhah/contracts";

const TOKEN_KEY = "muakhah_access_token";
const USER_KEY = "muakhah_user";
const REMEMBER_ME_KEY = "muakhah_remember_me";
const REMEMBERED_EMAIL_KEY = "muakhah_remembered_email";
const REMEMBERED_PASSWORD_KEY = "muakhah_remembered_password";

function encodePassword(password: string): string {
  return btoa(unescape(encodeURIComponent(password)));
}

function decodePassword(encoded: string): string | null {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return null;
  }
}

export type StoredUser = AuthResponse["user"];

function getAuthStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return getRememberMePreference() ? localStorage : sessionStorage;
}

export function getRememberMePreference(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(REMEMBER_ME_KEY);
  return stored === null ? true : stored === "true";
}

export function setRememberMePreference(rememberMe: boolean) {
  localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
  if (!rememberMe) {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function getRememberedEmail(): string | null {
  if (typeof window === "undefined") return null;
  if (!getRememberMePreference()) return null;
  return localStorage.getItem(REMEMBERED_EMAIL_KEY);
}

export function getRememberedPassword(): string | null {
  if (typeof window === "undefined") return null;
  if (!getRememberMePreference()) return null;
  const encoded = localStorage.getItem(REMEMBERED_PASSWORD_KEY);
  if (!encoded) return null;
  return decodePassword(encoded);
}

function saveRememberedCredentials(email: string, password: string) {
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email.toLowerCase());
  localStorage.setItem(REMEMBERED_PASSWORD_KEY, encodePassword(password));
}

function clearRememberedCredentials() {
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
}

export function saveAuth(
  data: AuthResponse,
  rememberMe = true,
  credentials?: { email: string; password: string },
) {
  setRememberMePreference(rememberMe);

  const storage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;

  storage.setItem(TOKEN_KEY, data.accessToken);
  storage.setItem(USER_KEY, JSON.stringify(data.user));
  otherStorage.removeItem(TOKEN_KEY);
  otherStorage.removeItem(USER_KEY);

  if (rememberMe && credentials?.email && credentials.password) {
    saveRememberedCredentials(credentials.email, credentials.password);
  } else {
    clearRememberedCredentials();
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  const storage = getAuthStorage();
  if (!storage) return null;
  return storage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  const storage = getAuthStorage();
  if (!storage) return null;
  const raw = storage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function updateStoredUser(partial: Partial<StoredUser>) {
  const storage = getAuthStorage();
  if (!storage) return;
  const user = getStoredUser();
  if (!user) return;
  storage.setItem(USER_KEY, JSON.stringify({ ...user, ...partial }));
}

export function isAuthenticated(): boolean {
  return Boolean(getToken() && getStoredUser());
}

export function getDashboardPath(userType: string): string {
  if (userType === "admin") return "/dashboard/admin";
  if (userType === "sponsor") return "/dashboard/visitor";
  if (userType === "family") return "/dashboard/family";
  return "/dashboard/visitor";
}
