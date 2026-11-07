import { redirect } from "next/navigation";
import PlannerV2 from "@/components/market-planning-v2/PlannerV2";
import { getSession } from "@/lib/prophunters-auth/session";
import { getUser } from "@/lib/prophunters-auth/users";

export default async function DubaiAnalysisPage() {
  // Server-side gate: no valid session cookie, no planner.
  const session = await getSession();
  if (!session) redirect("/dubai/login");
  // Greet by the client name set on the Users page; the administrator by their username.
  const user = session.admin ? null : await getUser(session.username);
  const raw = user?.name || session.username;
  const greetingName = raw.charAt(0).toUpperCase() + raw.slice(1);
  return <PlannerV2 isAdmin={session.admin} greetingName={greetingName} />;
}
