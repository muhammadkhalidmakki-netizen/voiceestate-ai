import type { Metadata } from "next";
import Link from "next/link";
import PlannerV2 from "@/components/market-planning-v2/PlannerV2";
import { getPlanService } from "@/lib/market-planning/plan-store";
import { stateFromUnknown } from "@/components/market-planning-v2/plan-state-io";

// A public, view-only copy of a saved plan. Anyone with the link can open it, no sign-in. It is not indexed by search engines,
// and it stops working the moment the owner switches the plan back to private.
export const metadata: Metadata = { title: "Shared plan · Dubai Market Planning", robots: { index: false, follow: false } };

export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = await getPlanService();
  const r = service ? await service.shared(token) : null;
  const state = r?.ok ? stateFromUnknown(r.value.plan) : null;

  if (!r?.ok || !state) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 8px" }}>This plan is not shared any more</h1>
          <p style={{ margin: "0 0 18px", color: "var(--mp-ink-2)", lineHeight: 1.5 }}>The link may have been switched off, or it is not correct. Ask the person who sent it for a new link.</p>
          <Link href="/dubai/login" style={{ fontWeight: 800, color: "var(--mp-blue-deep)" }}>
            Sign in
          </Link>
        </div>
      </main>
    );
  }
  return <PlannerV2 shared={{ name: r.value.name, state }} />;
}
