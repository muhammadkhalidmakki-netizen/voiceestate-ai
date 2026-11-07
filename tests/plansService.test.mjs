// Saved plans: the rules are the same whatever stores them (Cloudflare KV in production, a file in development).
import test from "node:test";
import assert from "node:assert/strict";
import { createPlanService, isPlanId, MAX_NAME, MAX_PLANS, MAX_PLAN_BYTES } from "../src/lib/market-planning/plans-service.ts";

function memoryStore() {
  const m = new Map();
  return {
    kind: "local",
    async list() { return [...m.values()].map(({ id, name, updatedAt }) => ({ id, name, updatedAt })); },
    async get(id) { return m.get(id) ?? null; },
    async put(r) { m.set(r.id, r); },
    async remove(id) { m.delete(id); },
    m,
  };
}
let n = 0;
const service = (store = memoryStore(), t = 0) => createPlanService(store, () => new Date(Date.UTC(2026, 10, 7, 12, 0, t++)), () => `plan-id-${String(++n).padStart(6, "0")}`);
const PLAN = { mode: "budget", amountText: "10000", shares: { IN: 1 } };

test("create then get returns the same plan, trimmed name, with an id and time", async () => {
  const s = service();
  const c = await s.create({ name: "  My   plan  ", plan: PLAN });
  assert.ok(c.ok);
  assert.equal(c.value.name, "My plan");
  const g = await s.get(c.value.id);
  assert.ok(g.ok);
  assert.deepEqual(g.value.plan, PLAN);
});

test("list is newest first", async () => {
  const s = service();
  const a = (await s.create({ name: "A", plan: PLAN })).value;
  const b = (await s.create({ name: "B", plan: PLAN })).value;
  const l = (await s.list()).value;
  assert.deepEqual(l.map((p) => p.id), [b.id, a.id]);
});

test("update changes the plan and time but keeps the id; a missing name keeps the old one", async () => {
  const s = service();
  const c = (await s.create({ name: "First", plan: PLAN })).value;
  const u = await s.update(c.id, { plan: { ...PLAN, amountText: "25000" } });
  assert.ok(u.ok);
  assert.equal(u.value.id, c.id);
  assert.equal(u.value.name, "First");
  assert.ok(u.value.updatedAt > c.updatedAt);
  assert.equal((await s.get(c.id)).value.plan.amountText, "25000");
  const renamed = await s.update(c.id, { name: "Second" });
  assert.equal(renamed.value.name, "Second");
});

test("remove deletes, and a second remove or get says not found", async () => {
  const s = service();
  const c = (await s.create({ name: "X", plan: PLAN })).value;
  assert.ok((await s.remove(c.id)).ok);
  assert.equal((await s.get(c.id)).status, 404);
  assert.equal((await s.remove(c.id)).status, 404);
});

test("bad input is refused with a clear message: empty name, no plan, huge plan, bad id", async () => {
  const s = service();
  assert.equal((await s.create({ name: "   ", plan: PLAN })).status, 400);
  assert.equal((await s.create({ name: "ok" })).status, 400);
  assert.equal((await s.create({ name: "ok", plan: "text" })).status, 400);
  assert.equal((await s.create({ name: "ok", plan: { big: "x".repeat(MAX_PLAN_BYTES) } })).status, 413);
  assert.equal((await s.get("../etc/passwd")).status, 400);
  assert.equal(isPlanId("abc"), false);
  assert.equal(isPlanId("0f8fad5b-d9cb-469f-a165-70867728950e"), true);
  const long = await s.create({ name: "n".repeat(MAX_NAME + 30), plan: PLAN });
  assert.equal(long.value.name.length, MAX_NAME);
});

test("there is a limit on how many plans can be kept", async () => {
  const store = memoryStore();
  const s = service(store);
  for (let i = 0; i < MAX_PLANS; i++) assert.ok((await s.create({ name: `p${i}`, plan: PLAN })).ok);
  assert.equal((await s.create({ name: "one too many", plan: PLAN })).status, 409);
});
