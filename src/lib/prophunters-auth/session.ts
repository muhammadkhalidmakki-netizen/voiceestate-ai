// Server-side session for the Prophunters Market Planning area (/dubai/*).
//
// - Credentials and the signing secret come ONLY from environment variables.
// - The cookie is an HMAC-signed, expiring token (no user data inside), set
//   HttpOnly + SameSite=Lax (+ Secure in production) and scoped to /dubai.
// - Uses the Web Crypto API only, so it also runs on Cloudflare Workers.
// - Fails closed: if anything is missing or too weak, nobody can sign in.
//
// Required env vars (names only, see .env.example):
//   PROPHUNTERS_USERNAME, PROPHUNTERS_PASSWORD, PROPHUNTERS_SESSION_SECRET

import { cookies } from "next/headers";

export const SESSION_COOKIE = "ph_session";
export const SESSION_PATH = "/dubai";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const MIN_SECRET_LENGTH = 32;

const encoder = new TextEncoder();

export type AuthConfig = {
  username: string;
  password: string;
  secret: string;
};

/** Returns the auth config, or null when it is missing or the secret is weak. */
export function getAuthConfig(): AuthConfig | null {
  const username = process.env.PROPHUNTERS_USERNAME;
  const password = process.env.PROPHUNTERS_PASSWORD;
  const secret = process.env.PROPHUNTERS_SESSION_SECRET;
  if (!username || !password || !secret) return null;
  if (secret.length < MIN_SECRET_LENGTH) return null;
  return { username, password, secret };
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/** Compares two strings without leaking where they differ. */
function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

async function digest(value: string): Promise<string> {
  return toBase64Url(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** Constant-time credential check (hashes first so length does not leak). */
export async function credentialsMatch(
  config: AuthConfig,
  username: string,
  password: string,
): Promise<boolean> {
  const [uGiven, uWant, pGiven, pWant] = await Promise.all([
    digest(username),
    digest(config.username),
    digest(password),
    digest(config.password),
  ]);
  const userOk = safeEqual(uGiven, uWant);
  const passOk = safeEqual(pGiven, pWant);
  return userOk && passOk;
}

export type Session = { username: string; admin: boolean };

/** Token: v2.<username>.<a|u>.<expires>.<signature>. Usernames are limited to [a-z0-9._-], so they are safe inside it. */
export async function createSessionToken(
  secret: string,
  who: Session,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const payload = `v2.${who.username}.${who.admin ? "a" : "u"}.${nowSeconds + SESSION_TTL_SECONDS}`;
  return `${payload}.${await sign(secret, payload)}`;
}

export async function verifySessionToken(
  secret: string,
  token: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  // The username may itself contain dots: signature is last, expiry second to last, role third to last.
  if (parts.length < 5 || parts[0] !== "v2") return null;
  const sig = parts[parts.length - 1];
  const expires = Number(parts[parts.length - 2]);
  const role = parts[parts.length - 3];
  const username = parts.slice(1, parts.length - 3).join(".");
  if (!Number.isInteger(expires) || expires <= nowSeconds || (role !== "a" && role !== "u") || !username) return null;
  const expected = await sign(secret, `v2.${username}.${role}.${expires}`);
  return safeEqual(expected, sig) ? { username, admin: role === "a" } : null;
}

/** Who is signed in, or null. */
export async function getSession(): Promise<Session | null> {
  const config = getAuthConfig();
  if (!config) return null;
  const store = await cookies();
  return verifySessionToken(config.secret, store.get(SESSION_COOKIE)?.value);
}

/** True only when the request carries a valid, unexpired session cookie. */
export async function hasValidSession(): Promise<boolean> {
  return (await getSession()) !== null;
}
