"use server";

import { revalidatePath } from "next/cache";
import { getAuthConfig, getSession } from "@/lib/prophunters-auth/session";
import { removeUser, saveUser } from "@/lib/prophunters-auth/users";

export type AdminState = { error?: string; done?: string };

async function adminOrNull() {
  const [session, config] = await Promise.all([getSession(), Promise.resolve(getAuthConfig())]);
  return session?.admin && config ? config : null;
}

export async function createUserAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const config = await adminOrNull();
  if (!config) return { error: "Only the administrator can do this." };
  const r = await saveUser(
    { username: String(form.get("username") ?? ""), name: String(form.get("name") ?? ""), password: String(form.get("password") ?? "") },
    config.username,
    "create",
  );
  if (!r.ok) return { error: r.error };
  revalidatePath("/dubai/admin");
  return { done: `Created ${String(form.get("username")).trim().toLowerCase()}. Give them the username and password you chose.` };
}

export async function resetPasswordAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const config = await adminOrNull();
  if (!config) return { error: "Only the administrator can do this." };
  const r = await saveUser({ username: String(form.get("username") ?? ""), name: "", password: String(form.get("password") ?? "") }, config.username, "reset");
  if (!r.ok) return { error: r.error };
  revalidatePath("/dubai/admin");
  return { done: `Password changed for ${String(form.get("username"))}.` };
}

export async function deleteUserAction(form: FormData): Promise<void> {
  if (!(await adminOrNull())) return;
  await removeUser(String(form.get("username") ?? ""));
  revalidatePath("/dubai/admin");
}
