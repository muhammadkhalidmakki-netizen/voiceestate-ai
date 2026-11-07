"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/dubai/actions";
import styles from "./login.module.css";

const initialState: LoginState = {};

const stroke = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [show, setShow] = useState(false);

  return (
    <form action={formAction}>
      {state.error ? (
        <p className={styles.error} role="alert">
          <svg {...stroke} width={18} height={18} style={{ flex: "none", marginTop: 1 }}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
          {state.error}
        </p>
      ) : null}

      <label className={styles.field}>
        <span className={styles.label}>Username</span>
        <span className={styles.control}>
          <svg {...stroke}>
            <circle cx="12" cy="8" r="3.6" />
            <path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5" />
          </svg>
          <input
            className={styles.input}
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <span className={styles.control}>
          <svg {...stroke}>
            <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </svg>
          <input
            className={styles.input}
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? (
              <svg {...stroke}>
                <path d="M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.5.9-1.5 2.3-3 3.5M6.4 7.9C4.3 9.2 3 11 2.5 12c1 1.8 4.5 6 9.5 6 1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </svg>
            ) : (
              <svg {...stroke}>
                <path d="M2.5 12C3.5 10.2 7 6 12 6s8.5 4.2 9.5 6c-1 1.8-4.5 6-9.5 6s-8.5-4.2-9.5-6z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </span>
      </label>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
        {!pending ? (
          <svg {...stroke} width={18} height={18}>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        ) : null}
      </button>
    </form>
  );
}
