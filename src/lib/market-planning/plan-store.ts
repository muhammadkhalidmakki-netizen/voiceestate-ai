// Where saved plans live.
//   Production (Cloudflare Worker): a KV namespace bound as PLANS. Plans are shared by everyone who signs in, and survive
//   browser changes, other devices and cleared data.
//   Development (`next dev`, no Worker): a JSON file in .data/. It exists only so the feature can be tried locally.
import { createPlanService, type PlanMeta, type PlanRecord, type PlanService, type PlanStore } from "./plans-service";

/** The small part of a Cloudflare KV namespace this feature uses. */
type KvLike = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { metadata?: unknown }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{ keys: Array<{ name: string; metadata?: unknown }>; list_complete: boolean; cursor?: string }>;
};

const PREFIX = "plan:";

function kvStore(kv: KvLike): PlanStore {
  // KV key listings can lag a minute or more behind writes, so saving and deleting would not show up straight away.
  // Reading a single key is immediate, so the list of plans is kept in one index key that is updated on every change.
  const INDEX = "planindex";
  const readIndex = async (): Promise<PlanMeta[]> => {
    const v = (await kv.get(INDEX, "json")) as PlanMeta[] | null;
    if (Array.isArray(v)) return v;
    // First use: build the index once from the plans saved before it existed.
    const out: PlanMeta[] = [];
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix: PREFIX, cursor });
      for (const k of page.keys) {
        const m = k.metadata as Partial<PlanMeta> | undefined;
        if (m?.name && m.updatedAt) out.push({ id: k.name.slice(PREFIX.length), name: m.name, updatedAt: m.updatedAt, owner: m.owner });
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    await kv.put(INDEX, JSON.stringify(out));
    return out;
  };
  return {
    kind: "cloudflare",
    list: readIndex,
    async get(id) {
      const r = (await kv.get(PREFIX + id, "json")) as PlanRecord | null;
      return r ?? null;
    },
    async put(record) {
      const meta: PlanMeta = { id: record.id, name: record.name, updatedAt: record.updatedAt, owner: record.owner };
      await kv.put(PREFIX + record.id, JSON.stringify(record), { metadata: meta });
      const idx = (await readIndex()).filter((p) => p.id !== record.id);
      await kv.put(INDEX, JSON.stringify([meta, ...idx]));
    },
    async remove(id) {
      await kv.delete(PREFIX + id);
      await kv.put(INDEX, JSON.stringify((await readIndex()).filter((p) => p.id !== id)));
    },
  };
}

/** Development only: plans in a JSON file on this machine. */
async function fileStore(): Promise<PlanStore> {
  const fs = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "node:fs/promises");
  const path = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "node:path");
  const file = path.join(process.cwd(), ".data", "plans.json");
  const read = async (): Promise<PlanRecord[]> => {
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      return Array.isArray(parsed) ? (parsed as PlanRecord[]) : [];
    } catch {
      return [];
    }
  };
  const write = async (list: PlanRecord[]) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(list), "utf8");
  };
  return {
    kind: "local",
    async list() {
      return (await read()).map(({ id, name, updatedAt, owner }) => ({ id, name, updatedAt, owner }));
    },
    async get(id) {
      return (await read()).find((r) => r.id === id) ?? null;
    },
    async put(record) {
      const list = (await read()).filter((r) => r.id !== record.id);
      await write([record, ...list]);
    },
    async remove(id) {
      await write((await read()).filter((r) => r.id !== id));
    },
  };
}

/** The KV namespace when running in the Worker, else null. Shared with the users store. */
export async function getKv(): Promise<KvLike | null> {
  try {
    const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers" as string)) as { env?: { PLANS?: KvLike } };
    return mod.env?.PLANS ?? null;
  } catch {
    return null;
  }
}
export type { KvLike };

let cached: Promise<PlanService | null> | null = null;

/** The plans service for this environment, or null when no storage is available (the API then says so). */
export function getPlanService(): Promise<PlanService | null> {
  cached ??= (async () => {
    const kv = await getKv();
    if (kv) return createPlanService(kvStore(kv));
    if (process.env.NODE_ENV !== "production") return createPlanService(await fileStore());
    return null;
  })();
  return cached;
}
