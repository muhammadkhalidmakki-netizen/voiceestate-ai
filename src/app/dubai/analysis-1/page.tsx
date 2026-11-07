import { redirect } from "next/navigation";
import MarketPlanner from "@/components/market-planning/MarketPlanner";
import { hasValidSession } from "@/lib/prophunters-auth/session";

// The original layout, kept at its own address. The main planner is now /dubai/analysis.
export default async function DubaiAnalysisV1Page() {
  // Same server-side gate: no valid session cookie, no planner.
  if (!(await hasValidSession())) redirect("/dubai/login");
  return <MarketPlanner />;
}
