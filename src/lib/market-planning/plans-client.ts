// Browser side of saved plans: talks to /dubai/api/plans. Plans live on the server (Cloudflare KV), not in this browser.

export type PlanMeta = { id: string; name: string; updatedAt: string };
export type PlanRecord = PlanMeta & { plan: unknown };

const BASE = "/dubai/api/plans";

export class PlansError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new PlansError("Could not reach the server. Check your connection and try again.", 0);
  }
  let body: { error?: string } & Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    /* no JSON body */
  }
  if (!res.ok) throw new PlansError(body.error ?? "Something went wrong saving plans.", res.status);
  return body as T;
}

export const listPlans = () => call<{ plans: PlanMeta[]; storage: "cloudflare" | "local" }>("");
export const getPlan = (id: string) => call<{ plan: PlanRecord }>(`/${encodeURIComponent(id)}`).then((r) => r.plan);
export const createPlan = (name: string, plan: unknown) => call<{ plan: PlanMeta }>("", { method: "POST", body: JSON.stringify({ name, plan }) }).then((r) => r.plan);
export const updatePlan = (id: string, input: { name?: string; plan?: unknown }) => call<{ plan: PlanMeta }>(`/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }).then((r) => r.plan);
export const deletePlan = (id: string) => call<{ ok: true }>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
