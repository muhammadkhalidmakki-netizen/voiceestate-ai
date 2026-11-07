"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_PATH,
  SESSION_TTL_SECONDS,
  createSessionToken,
  credentialsMatch,
  getAuthConfig,
} from "@/lib/prophunters-auth/session";

export type LoginState = { error?: string };

const GENERIC_ERROR = "That username or password is not correct.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const config = getAuthConfig();
  if (!config) {
    return { error: "Sign-in is not available right now. Please contact your administrator." };
  }

  const username = String(formData.get("username") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 200);

  const ok = await credentialsMatch(config, username, password);
  if (!ok) {
    // Small delay slows down password guessing without any extra storage.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: GENERIC_ERROR };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(config.secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: SESSION_PATH,
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/dubai/analysis");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: SESSION_PATH,
    maxAge: 0,
  });
  redirect("/dubai/login");
}
