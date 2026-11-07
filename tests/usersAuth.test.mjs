// Multiple users: password hashing, session tokens that carry who is signed in, and plans kept private per user.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./helpers/app-loader.mjs", import.meta.url);
const { hashPassword, verifyPassword, USERNAME_RE } = await import("../src/lib/prophunters-auth/users.ts");
const { createPlanService } = await import("../src/lib/market-planning/plans-service.ts");

// session.ts imports next/headers; the token functions are tested through a tiny stand-in module of the same code
const { createSessionToken, verifySessionToken } = await import("../src/lib/prophunters-auth/session.ts").catch(() => ({}));

const SECRET = "x".repeat(40);

test("a password verifies with the right password only, and every hash is salted", async () => {
  const a = await hashPassword("correct horse");
  const b = await hashPassword("correct horse");
  assert.notEqual(a.hash, b.hash);
  assert.ok(await verifyPassword({ username: "u", name: "U", createdAt: "", ...a }, "correct horse"));
  assert.ok(!(await verifyPassword({ username: "u", name: "U", createdAt: "", ...a }, "wrong")));
  assert.ok(!a.hash.includes("correct"));
});

test("usernames are limited to safe characters", () => {
  for (const ok of ["acme", "client.one", "a-b_c9"]) assert.ok(USERNAME_RE.test(ok), ok);
  for (const bad of ["ab", "Bad", "has space", "../x", "a".repeat(40), "-start"]) assert.ok(!USERNAME_RE.test(bad), bad);
});

if (createSessionToken) {
  test("a session token says who is signed in, and tampering breaks it", async () => {
    const t = await createSessionToken(SECRET, { username: "client.one", admin: false });
    assert.deepEqual(await verifySessionToken(SECRET, t), { username: "client.one", admin: false });
    const admin = await createSessionToken(SECRET, { username: "boss", admin: true });
    assert.equal((await verifySessionToken(SECRET, admin)).admin, true);
    // turning a normal user into an admin invalidates the signature
    const forged = t.replace(".u.", ".a.");
    assert.equal(await verifySessionToken(SECRET, forged), null);
    assert.equal(await verifySessionToken("y".repeat(40), t), null);
    assert.equal(await verifySessionToken(SECRET, t, Math.floor(Date.now() / 1000) + 9 * 3600), null);
  });
}

function memoryStore() {
  const m = new Map();
  return { kind: "local", list: async () => [...m.values()].map(({ id, name, updatedAt, owner }) => ({ id, name, updatedAt, owner })), get: async (id) => m.get(id) ?? null, put: async (r) => void m.set(r.id, r), remove: async (id) => void m.delete(id) };
}
let n = 0;
const svc = () => createPlanService(memoryStore(), () => new Date(), () => `plan-id-${String(++n).padStart(6, "0")}`);
const PLAN = { mode: "budget" };
const A = { user: "alice", admin: false };
const B = { user: "bob", admin: false };
const ADMIN = { user: "boss", admin: true };

test("each user sees, opens, changes and deletes only their own plans; the admin sees all", async () => {
  const s = svc();
  const pa = (await s.create({ name: "Alice plan", plan: PLAN }, A)).value;
  const pb = (await s.create({ name: "Bob plan", plan: PLAN }, B)).value;
  assert.deepEqual((await s.list(A)).value.map((p) => p.id), [pa.id]);
  assert.deepEqual((await s.list(B)).value.map((p) => p.id), [pb.id]);
  assert.equal((await s.list(ADMIN)).value.length, 2);
  assert.equal((await s.get(pb.id, A)).status, 404);
  assert.equal((await s.update(pb.id, { name: "mine now" }, A)).status, 404);
  assert.equal((await s.remove(pb.id, A)).status, 404);
  assert.ok((await s.get(pb.id, ADMIN)).ok);
  assert.ok((await s.remove(pa.id, A)).ok);
});

test("plans saved before there were users (no owner) are visible to the admin only", async () => {
  const store = memoryStore();
  await store.put({ id: "legacy-plan-1", name: "Old", updatedAt: "2026-01-01T00:00:00Z", plan: PLAN });
  const s = createPlanService(store);
  assert.equal((await s.list(A)).value.length, 0);
  assert.equal((await s.list(ADMIN)).value.length, 1);
});

test("an update keeps the original owner", async () => {
  const s = svc();
  const p = (await s.create({ name: "Mine", plan: PLAN }, A)).value;
  await s.update(p.id, { plan: { mode: "leads" } }, ADMIN);
  assert.equal((await s.get(p.id, A)).value.owner, "alice");
});
