"use client";

import { getToken } from "./auth";

export const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3000";

export function buildLandingUrl(path = "/browse-families", token = getToken()) {
  const safePath = path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/browse-families";
  const url = `${LANDING_URL}${safePath}`;
  return token ? `${url}#access_token=${encodeURIComponent(token)}` : url;
}

export function buildLandingFamilyUrl(publicCode: string, token = getToken()) {
  return buildLandingUrl(
    `/browse-families/${encodeURIComponent(publicCode)}`,
    token,
  );
}
