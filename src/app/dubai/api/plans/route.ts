import { hasValidSession } from "@/lib/prophunters-auth/session";
import { getPlanService } from "@/lib/market-planning/plan-store";

// Saved plans for the Dubai planner. Same sign-in as the planner; nothing is returned without a valid session.
// The path is under /dubai so the session cookie (scoped to /dubai) is sent with these requests.

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

async function guard() {
  if (!(await hasValidSession())) return { res: json({ error: "Please sign in again." }, 401) } as const;
  const service = await getPlanService();
  if (!service) return { res: json({ error: "Saved plans storage is not set up on this server yet." }, 503) } as const;
  return { service } as const;
}

export async function GET() {
  const g = await guard();
  if ("res" in g) return g.res;
  const r = await g.service.list();
  return r.ok ? json({ plans: r.value, storage: g.service.storage }) : json({ error: r.error }, r.status);
}

export async function POST(request: Request) {
  const g = await guard();
  if ("res" in g) return g.res;
  let body: { name?: unknown; plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "That request could not be read." }, 400);
  }
  const r = await g.service.create(body);
  return r.ok ? json({ plan: r.value }, 201) : json({ error: r.error }, r.status);
}
