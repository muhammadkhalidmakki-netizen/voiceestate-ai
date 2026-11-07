import { redirect } from "next/navigation";
import LoginForm from "@/components/market-planning/LoginForm";
import styles from "@/components/market-planning/login.module.css";
import { hasValidSession } from "@/lib/prophunters-auth/session";

export default async function LoginPage() {
  if (await hasValidSession()) redirect("/dubai/analysis");

  return (
    <main className={styles.wrap}>
      <div className={styles.grid} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="signin-title">
        <h1 id="signin-title" className={styles.title}>
          Welcome back
        </h1>
        <p className={styles.lede}>Sign in to continue to your planning workspace.</p>
        <LoginForm />
      </section>
    </main>
  );
}
