import { getSession } from "@/lib/prophunters-auth/session";
import { getPlanService } from "@/lib/market-planning/plan-store";

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

// Turn a saved plan's public link on or off. Only the plan's owner (or the admin) can.
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return json({ error: "Please sign in again." }, 401);
  const service = await getPlanService();
  if (!service) return json({ error: "Saved plans storage is not set up on this server yet." }, 503);
  let body: { public?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "That request could not be read." }, 400);
  }
  const { id } = await ctx.params;
  const r = await service.setShare(id, body.public === true, { user: session.username, admin: session.admin });
  return r.ok ? json({ shareToken: r.value.shareToken }) : json({ error: r.error }, r.status);
}
