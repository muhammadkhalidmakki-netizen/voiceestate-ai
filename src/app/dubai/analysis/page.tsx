import { redirect } from "next/navigation";
import PlannerV2 from "@/components/market-planning-v2/PlannerV2";
import { getSession } from "@/lib/prophunters-auth/session";

export default async function DubaiAnalysisPage() {
  // Server-side gate: no valid session cookie, no planner.
  const session = await getSession();
  if (!session) redirect("/dubai/login");
  return <PlannerV2 isAdmin={session.admin} />;
}
