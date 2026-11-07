"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, TriangleAlert } from "lucide-react";
import { login, type LoginState } from "@/app/dubai/actions";
import styles from "./login.module.css";

const initialState: LoginState = {};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [show, setShow] = useState(false);

  return (
    <motion.form action={formAction} className={styles.form} variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <p className={styles.eyebrow}>Sign in</p>
        <h1 id="signin-title" className={styles.heading}>
          Welcome back
        </h1>
        <p className={styles.sub}>Open your planning workspace and pick up where you left off.</p>
      </motion.div>

      {state.error ? (
        <motion.p key={state.error} className={styles.err} role="alert" initial={{ x: 0, opacity: 0 }} animate={{ x: [0, -8, 8, -5, 5, 0], opacity: 1 }} transition={{ duration: 0.45 }}>
          <TriangleAlert size={18} aria-hidden="true" />
          {state.error}
        </motion.p>
      ) : null}

      <motion.div variants={item} className={styles.floating}>
        <input id="username" className={styles.fInput} name="username" type="text" placeholder=" " autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        <label htmlFor="username" className={styles.fLabel}>Username</label>
      </motion.div>

      <motion.div variants={item} className={styles.floating}>
        <input id="password" className={styles.fInput} name="password" type={show ? "text" : "password"} placeholder=" " autoComplete="current-password" required style={{ paddingRight: 52 }} />
        <label htmlFor="password" className={styles.fLabel}>Password</label>
        <button type="button" className={styles.eye} onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </motion.div>

      <motion.button variants={item} className={styles.cta} type="submit" disabled={pending} whileTap={{ scale: 0.98 }}>
        <span>{pending ? "Signing you in…" : "Sign in"}</span>
        {!pending ? <ArrowRight size={18} className={styles.ctaArrow} aria-hidden="true" /> : <span className={styles.spinner} aria-hidden="true" />}
      </motion.button>

      <motion.p variants={item} className={styles.trust}>
        <LockKeyhole size={14} aria-hidden="true" /> Private workspace. Access is by invitation: ask your administrator for a login.
      </motion.p>
    </motion.form>
  );
}
