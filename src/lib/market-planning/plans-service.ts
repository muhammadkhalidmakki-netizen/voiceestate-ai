// Saved plans, independent of where they are stored. The storage (Cloudflare KV in production, a local file in
// development) is passed in, so the rules (names, size limits, ids) are the same everywhere and can be tested.

export type PlanMeta = { id: string; name: string; updatedAt: string; /** The user who owns the plan. Missing on plans saved before there were separate users (admin only). */ owner?: string; /** Set while the plan is public: the secret in its share link. */ shareToken?: string };
/** Who is asking. Without it nothing is filtered (used by tests). An admin sees every plan. */
export type Viewer = { user: string; admin: boolean };
export type PlanRecord = PlanMeta & { plan: unknown };

/** What a storage backend must do. Every method is async so KV, files or a database all fit. */
export interface PlanStore {
  readonly kind: "cloudflare" | "local";
  list(): Promise<PlanMeta[]>;
  get(id: string): Promise<PlanRecord | null>;
  put(record: PlanRecord): Promise<void>;
  remove(id: string): Promise<void>;
  /** Share links: token -> plan id. */
  getShare(token: string): Promise<string | null>;
  putShare(token: string, id: string): Promise<void>;
  removeShare(token: string): Promise<void>;
}

export const MAX_PLANS = 50;
export const MAX_NAME = 40;
export const MAX_PLAN_BYTES = 64 * 1024;

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): Result<never> => ({ ok: false, status, error });

const ID = /^[a-zA-Z0-9-]{8,64}$/;
const TOKEN = /^[a-f0-9]{32,64}$/;
const newToken = () => (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
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

const canSee = (r: PlanMeta, who?: Viewer) => !who || who.admin || (r.owner ?? "") === who.user;

const byNewest = (a: PlanMeta, b: PlanMeta) => b.updatedAt.localeCompare(a.updatedAt);

export function createPlanService(store: PlanStore, now: () => Date = () => new Date(), newId: () => string = () => crypto.randomUUID()) {
  return {
    storage: store.kind,

    async list(who?: Viewer): Promise<Result<PlanMeta[]>> {
      return { ok: true, value: (await store.list()).filter((p) => canSee(p, who)).sort(byNewest) };
    },

    async get(id: string, who?: Viewer): Promise<Result<PlanRecord>> {
      if (!isPlanId(id)) return fail(400, "That plan id is not valid.");
      const r = await store.get(id);
      return r && canSee(r, who) ? { ok: true, value: r } : fail(404, "That plan was not found. It may have been deleted.");
    },

    async create(input: { name?: unknown; plan?: unknown }, who?: Viewer): Promise<Result<PlanMeta>> {
      const name = cleanName(input.name);
      if (!name) return fail(400, "Give the plan a name.");
      if (input.plan === null || typeof input.plan !== "object") return fail(400, "There is no plan to save.");
      if (planBytes(input.plan) > MAX_PLAN_BYTES) return fail(413, "That plan is too large to save.");
      if ((await store.list()).filter((p) => canSee(p, who)).length >= MAX_PLANS) return fail(409, `You can keep up to ${MAX_PLANS} plans. Delete one first.`);
      const record: PlanRecord = { id: newId(), name, updatedAt: now().toISOString(), plan: input.plan, ...(who ? { owner: who.user } : {}) };
      await store.put(record);
      return { ok: true, value: { id: record.id, name: record.name, updatedAt: record.updatedAt, owner: record.owner } };
    },

    async update(id: string, input: { name?: unknown; plan?: unknown }, who?: Viewer): Promise<Result<PlanMeta>> {
      if (!isPlanId(id)) return fail(400, "That plan id is not valid.");
      const existing = await store.get(id);
      if (!existing || !canSee(existing, who)) return fail(404, "That plan was not found. It may have been deleted.");
      const name = input.name === undefined ? existing.name : cleanName(input.name);
      if (!name) return fail(400, "Give the plan a name.");
      const plan = input.plan === undefined ? existing.plan : input.plan;
      if (plan === null || typeof plan !== "object") return fail(400, "There is no plan to save.");
      if (planBytes(plan) > MAX_PLAN_BYTES) return fail(413, "That plan is too large to save.");
      const record: PlanRecord = { id, name, updatedAt: now().toISOString(), plan, ...(existing.owner ? { owner: existing.owner } : {}), ...(existing.shareToken ? { shareToken: existing.shareToken } : {}) };
      await store.put(record);
      return { ok: true, value: { id, name, updatedAt: record.updatedAt, owner: record.owner } };
    },

    /** Turn the public link on or off. On creates a fresh secret link; off ends it at once. */
    async setShare(id: string, enabled: boolean, who?: Viewer): Promise<Result<{ shareToken: string | null }>> {
      if (!isPlanId(id)) return fail(400, "That plan id is not valid.");
      const rec = await store.get(id);
      if (!rec || !canSee(rec, who)) return fail(404, "That plan was not found. It may have been deleted.");
      if (enabled) {
        if (rec.shareToken) return { ok: true, value: { shareToken: rec.shareToken } };
        const token = newToken();
        await store.put({ ...rec, shareToken: token });
        await store.putShare(token, id);
        return { ok: true, value: { shareToken: token } };
      }
      if (rec.shareToken) await store.removeShare(rec.shareToken);
      const { shareToken: _gone, ...rest } = rec;
      void _gone;
      await store.put(rest);
      return { ok: true, value: { shareToken: null } };
    },

    /** What a public link shows: the plan only. No owner, no id, nothing about other plans. */
    async shared(token: string): Promise<Result<{ name: string; updatedAt: string; plan: unknown }>> {
      if (!TOKEN.test(token)) return fail(404, "This link is not valid.");
      const id = await store.getShare(token);
      const rec = id ? await store.get(id) : null;
      if (!rec || rec.shareToken !== token) return fail(404, "This link is no longer shared.");
      return { ok: true, value: { name: rec.name, updatedAt: rec.updatedAt, plan: rec.plan } };
    },

    async remove(id: string, who?: Viewer): Promise<Result<true>> {
      if (!isPlanId(id)) return fail(400, "That plan id is not valid.");
      const found = await store.get(id);
      if (!found || !canSee(found, who)) return fail(404, "That plan was not found. It may have been deleted.");
      if (found.shareToken) await store.removeShare(found.shareToken);
      await store.remove(id);
      return { ok: true, value: true };
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;
