"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import styles from "./login.module.css";

const BARS = [34, 52, 41, 68, 58, 84, 72, 96];
const LINES = [
  "Which markets bring buyers, not just cheap leads.",
  "Your languages, matched to the countries that speak them.",
  "A budget split you can explain to a client.",
];

function Count({ to }: { to: number }) {
  const [v, setV] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const c = animate(0, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [to, reduced]);
  return <>{(reduced ? to : v).toLocaleString("en-US")}</>;
}

/** Brand side of the sign-in screen: a calm animated preview of what the planner does. */
export default function LoginHero() {
  const reduced = useReducedMotion();
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setLine((n) => (n + 1) % LINES.length), 3600);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <aside className={styles.hero} aria-label="About the planner">
      <div className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroBody}>
        <motion.h2 className={styles.heroTitle} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          Plan where your next Dubai buyer comes from.
        </motion.h2>
        <div className={styles.rotator} aria-live="polite">
          <motion.p key={line} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            {LINES[line]}
          </motion.p>
        </div>

        <div className={styles.chart} role="img" aria-label="Illustration: budget share by market growing across eight markets">
          <div className={styles.chartHead}>
            <span>Budget share by market</span>
            <b className={styles.live}>Live model</b>
          </div>
          <div className={styles.bars}>
            {BARS.map((h, i) => (
              <div key={i} className={styles.barCol}>
                <motion.span
                  className={styles.bar}
                  initial={{ height: "6%" }}
                  animate={reduced ? { height: `${h}%` } : { height: [`${h * 0.5}%`, `${h}%`, `${h * 0.82}%`, `${h}%`] }}
                  transition={{ duration: 5, delay: 0.3 + i * 0.09, repeat: reduced ? 0 : Infinity, repeatType: "mirror", ease: "easeInOut" }}
                />
              </div>
            ))}
            <svg className={styles.trend} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
              <motion.path d="M2 34 C 18 30, 24 24, 38 22 S 62 14, 76 9 S 92 4, 98 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.2, delay: 0.5, ease: "easeInOut" }} />
            </svg>
          </div>
        </div>

        <ul className={styles.stats}>
          <li>
            <b><Count to={249} /></b>
            <span>countries scored</span>
          </li>
          <li>
            <b><Count to={14} /></b>
            <span>languages mapped</span>
          </li>
          <li>
            <b><Count to={43} /></b>
            <span>sources behind it</span>
          </li>
        </ul>
      </div>

      <p className={styles.heroFoot}>Every figure is labelled as measured, estimated or still missing.</p>
    </aside>
  );
}
