import { redirect } from "next/navigation";
import LoginForm from "@/components/market-planning/LoginForm";
import ExpertChat from "@/components/market-planning/ExpertChat";
import LoginHero from "@/components/market-planning/LoginHero";
import styles from "@/components/market-planning/login.module.css";
import { hasValidSession } from "@/lib/prophunters-auth/session";

export default async function LoginPage() {
  if (await hasValidSession()) redirect("/dubai/analysis");

  return (
    <main className={styles.split}>
      <LoginHero />
      <div className={styles.wrap}>
        <div className={styles.grid} aria-hidden="true" />
        <section className={styles.panel} aria-labelledby="signin-title">
          <LoginForm />
        </section>
      </div>
      <ExpertChat />
    </main>
  );
}
