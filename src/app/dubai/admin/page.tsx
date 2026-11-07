import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/prophunters-auth/session";
import { listUsers, usersAvailable } from "@/lib/prophunters-auth/users";
import { getPlanService } from "@/lib/market-planning/plan-store";
import AdminUsers from "@/components/market-planning/AdminUsers";
import s from "@/components/market-planning/admin.module.css";

// Only the administrator can open this page. Everyone else is sent back to the planner (or to sign in).
export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/dubai/login");
  if (!session.admin) redirect("/dubai/analysis");
  const [users, available, plans] = await Promise.all([listUsers(), usersAvailable(), getPlanService().then((p) => p?.list({ user: session.username, admin: true }))]);
  const counts = new Map<string, number>();
  if (plans?.ok) for (const p of plans.value) if (p.owner) counts.set(p.owner, (counts.get(p.owner) ?? 0) + 1);

  return (
    <main className={s.page}>
      <Link href="/dubai/analysis" className={s.back}>
        ← Back to the planner
      </Link>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Users</h1>
          <p className={s.lead}>Give each client their own login. Every client sees only their own saved plans. As administrator you see all of them.</p>
        </div>
      </div>
      <AdminUsers users={users.map((u) => ({ ...u, plans: counts.get(u.username) ?? 0 }))} available={available} />
    </main>
  );
}
