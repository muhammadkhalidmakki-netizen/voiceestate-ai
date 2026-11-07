// Users who can sign in to the planner. The admin is the one set in the server settings (PROPHUNTERS_USERNAME / PASSWORD);
// every other user is created by the admin on /dubai/admin and stored in the same KV namespace (a local file in development).
// Passwords are never stored: only a salted PBKDF2 hash. Web Crypto only, so it runs on Cloudflare Workers.
import { getKv } from "@/lib/market-planning/plan-store";

export type StoredUser = { username: string; name: string; salt: string; hash: string; createdAt: string };
export type PublicUser = Pick<StoredUser, "username" | "name" | "createdAt">;

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const MIN_PASSWORD = 8;
const ITERATIONS = 100_000; // the most the Workers runtime allows for PBKDF2
const PREFIX = "user:";
const enc = new TextEncoder();

const b64 = (bytes: ArrayBuffer | Uint8Array) => {
  let s = "";
  for (const b of new Uint8Array(bytes as ArrayBuffer)) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS }, key, 256));
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: await derive(password, salt) };
}

export async function verifyPassword(user: StoredUser, password: string): Promise<boolean> {
  const got = await derive(password, unb64(user.salt));
  let diff = got.length ^ user.hash.length;
  for (let i = 0; i < Math.max(got.length, user.hash.length); i++) diff |= (got.charCodeAt(i) || 0) ^ (user.hash.charCodeAt(i) || 0);
  return diff === 0;
}

type UserStore = {
  get(u: string): Promise<StoredUser | null>;
  put(u: StoredUser): Promise<void>;
  remove(u: string): Promise<void>;
  list(): Promise<StoredUser[]>;
};

async function fileStore(): Promise<UserStore> {
  const fs = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "node:fs/promises");
  const path = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "node:path");
  const file = path.join(process.cwd(), ".data", "users.json");
  const read = async (): Promise<StoredUser[]> => {
    try {
      const p = JSON.parse(await fs.readFile(file, "utf8"));
      return Array.isArray(p) ? (p as StoredUser[]) : [];
    } catch {
      return [];
    }
  };
  const write = async (l: StoredUser[]) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(l), "utf8");
  };
  return {
    get: async (u) => (await read()).find((x) => x.username === u) ?? null,
    put: async (u) => write([u, ...(await read()).filter((x) => x.username !== u.username)]),
    remove: async (u) => write((await read()).filter((x) => x.username !== u)),
    list: read,
  };
}

let cached: Promise<UserStore | null> | null = null;
function store(): Promise<UserStore | null> {
  cached ??= (async () => {
    const kv = await getKv();
    if (kv) {
      return {
        get: async (u) => ((await kv.get(PREFIX + u, "json")) as StoredUser | null) ?? null,
        put: async (u) => kv.put(PREFIX + u.username, JSON.stringify(u)),
        remove: async (u) => kv.delete(PREFIX + u),
        list: async () => {
          const out: StoredUser[] = [];
          let cursor: string | undefined;
          do {
            const page = await kv.list({ prefix: PREFIX, cursor });
            for (const k of page.keys) {
              const u = (await kv.get(k.name, "json")) as StoredUser | null;
              if (u) out.push(u);
            }
            cursor = page.list_complete ? undefined : page.cursor;
          } while (cursor);
          return out;
        },
      } satisfies UserStore;
    }
    return process.env.NODE_ENV !== "production" ? fileStore() : null;
  })();
  return cached;
}

export const usersAvailable = async () => (await store()) !== null;

export async function getUser(username: string): Promise<StoredUser | null> {
  const s = await store();
  return s ? await s.get(username) : null;
}
export async function listUsers(): Promise<PublicUser[]> {
  const s = await store();
  const all = s ? await s.list() : [];
  return all.map(({ username, name, createdAt }) => ({ username, name, createdAt })).sort((a, b) => a.username.localeCompare(b.username));
}

export type UserResult = { ok: true } | { ok: false; error: string };

export async function saveUser(input: { username: string; name: string; password: string }, adminUsername: string, mode: "create" | "reset"): Promise<UserResult> {
  const s = await store();
  if (!s) return { ok: false, error: "User storage is not set up on this server yet." };
  const username = input.username.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) return { ok: false, error: "Username: 3 to 32 letters, numbers, dots, dashes or underscores, starting with a letter or number." };
  if (username === adminUsername.toLowerCase()) return { ok: false, error: "That username belongs to the administrator. Choose another." };
  if (input.password.length < MIN_PASSWORD || input.password.length > 100) return { ok: false, error: `Password: ${MIN_PASSWORD} to 100 characters.` };
  const existing = await s.get(username);
  if (mode === "create" && existing) return { ok: false, error: "That username is already taken." };
  if (mode === "reset" && !existing) return { ok: false, error: "That user does not exist." };
  const { salt, hash } = await hashPassword(input.password);
  await s.put({ username, name: (input.name.trim() || existing?.name || username).slice(0, 60), salt, hash, createdAt: existing?.createdAt ?? new Date().toISOString() });
  return { ok: true };
}

export async function removeUser(username: string): Promise<void> {
  const s = await store();
  if (s) await s.remove(username.trim().toLowerCase());
}
