import { hasValidSession } from "@/lib/prophunters-auth/session";
import { getPlanService } from "@/lib/market-planning/plan-store";

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

async function guard() {
  if (!(await hasValidSession())) return { res: json({ error: "Please sign in again." }, 401) } as const;
  const service = await getPlanService();
  if (!service) return { res: json({ error: "Saved plans storage is not set up on this server yet." }, 503) } as const;
  return { service } as const;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if ("res" in g) return g.res;
  const { id } = await ctx.params;
  const r = await g.service.get(id);
  return r.ok ? json({ plan: r.value }) : json({ error: r.error }, r.status);
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if ("res" in g) return g.res;
  const { id } = await ctx.params;
  let body: { name?: unknown; plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "That request could not be read." }, 400);
  }
  const r = await g.service.update(id, body);
  return r.ok ? json({ plan: r.value }) : json({ error: r.error }, r.status);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if ("res" in g) return g.res;
  const { id } = await ctx.params;
  const r = await g.service.remove(id);
  return r.ok ? json({ ok: true }) : json({ error: r.error }, r.status);
}
