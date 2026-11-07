// Saved plans, independent of where they are stored. The storage (Cloudflare KV in production, a local file in
// development) is passed in, so the rules (names, size limits, ids) are the same everywhere and can be tested.

export type PlanMeta = { id: string; name: string; updatedAt: string };
export type PlanRecord = PlanMeta & { plan: unknown };

/** What a storage backend must do. Every method is async so KV, files or a database all fit. */
export interface PlanStore {
  readonly kind: "cloudflare" | "local";
  list(): Promise<PlanMeta[]>;
  get(id: string): Promise<PlanRecord | null>;
  put(record: PlanRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export const MAX_PLANS = 50;
export const MAX_NAME = 40;
export const MAX_PLAN_BYTES = 64 * 1024;

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): Result<never> => ({ ok: false, status, error });

const ID = /^[a-zA-Z0-9-]{8,64}$/;
export const isPlanId = (id: string): boolean => ID.test(id);

const cleanName = (name: unknown): string | null => {
  if (typeof name !== "string") return null;
  const n = name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return n.length ? n : null;
};

const planBytes = (plan: unknown): number => {
  try {
    return new TextEncoder().encode(JSON.stringify(plan)).length;
  } catch {
    return Infinity;
  }
};

const byNewest = (a: PlanMeta, b: PlanMeta) => b.updatedAt.localeCompare(a.updatedAt);

export function createPlanService(store: PlanStore, now: () => Date = () => new Date(), newId: () => string = () => crypto.randomUUID()) {
  return {
    storage: store.kind,

    async list(): Promise<Result<PlanMeta[]>> {
      return { ok: true, value: (await store.list()).sort(byNewest) };
    },

    async get(id: string): Promise<Result<PlanRecord>> {
      if (!isPlanId(id)) return fail(400, "That plan id is not valid.");
      const r = await store.get(id);
      return r ? { ok: true, value: r } : fail(404, "That plan was not found. It may have been deleted.");
    },

    async create(input: { name?: unknown; plan?: unknown }): Promise<Result<PlanMeta>> {
      const name = cleanName(input.name);
      if (!name) return fail(400, "Give the plan a name.");
      if (input.plan === null || typeof input.plan !== "object") return fail(400, "There is no plan to save.");
      if (planBytes(input.plan) > MAX_PLAN_BYTES) return fail(413, "That plan is too large to save.");
      if ((await store.list()).length >= MAX_PLANS) return fail(409, `You can keep up to ${MAX_PLANS} plans. Delete one first.`);
      const record: PlanRecord = { id: newId(), name, updatedAt: now().toISOString(), plan: input.plan };
      await store.put(record);
      return { ok: true, value: { id: record.id, name: record.name, updatedAt: record.updatedAt } };
    },

    async update(id: string, input: { name?: unknown; plan?: unknown }): Promise<Result<PlanMeta>> {
      if (!isPlanId(id)) return fail(400, "That plan id is not valid.");
      const existing = await store.get(id);
      if (!existing) return fail(404, "That plan was not found. It may have been deleted.");
      const name = input.name === undefined ? existing.name : cleanName(input.name);
      if (!name) return fail(400, "Give the plan a name.");
      const plan = input.plan === undefined ? existing.plan : input.plan;
      if (plan === null || typeof plan !== "object") return fail(400, "There is no plan to save.");
      if (planBytes(plan) > MAX_PLAN_BYTES) return fail(413, "That plan is too large to save.");
      const record: PlanRecord = { id, name, updatedAt: now().toISOString(), plan };
      await store.put(record);
      return { ok: true, value: { id, name, updatedAt: record.updatedAt } };
    },

    async remove(id: string): Promise<Result<true>> {
      if (!isPlanId(id)) return fail(400, "That plan id is not valid.");
      if (!(await store.get(id))) return fail(404, "That plan was not found. It may have been deleted.");
      await store.remove(id);
      return { ok: true, value: true };
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;
