"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, X } from "lucide-react";
import styles from "./expert-chat.module.css";

const PHONE = "447446963577"; // +44 7446 963577
const NAME = "Muhammad";

const TOPICS = [
  { label: "Hire an expert", text: "I'd like to hire you to help plan my Dubai real estate buyer acquisition." },
  { label: "Get a custom plan", text: "I'd like a custom market and budget plan built for my project." },
  { label: "Add a market or language", text: "I'd like to add a market or language that isn't covered in the tool yet." },
  { label: "Ask a question", text: "I have a question about the numbers in the tool." },
] as const;

const wa = (text: string, context?: string) => `https://wa.me/${PHONE}?text=${encodeURIComponent(`Hi ${NAME}, I'm using the Dubai Market Planning tool. ${text}${context ? `\n\n${context}` : ""}`)}`;

/** A floating chat bubble: a friendly prompt from the expert, quick topics, and a WhatsApp enquiry with the right message. */
export default function ExpertChat({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [step, setStep] = useState(0); // 0 typing, 1 first message, 2 second message + options

  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timers = [setTimeout(() => setStep(1), 700), setTimeout(() => setStep(2), 1700)];
    return () => {
      timers.forEach(clearTimeout);
      setStep(0);
    };
  }, [open]);

  return (
    <div className={`${styles.dock} ${context ? styles.aboveDock : ""}`}>
      <AnimatePresence>
        {open ? (
          <motion.section key="card" className={styles.card} role="dialog" aria-label={`Chat with ${NAME} on WhatsApp`} initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <header className={styles.head}>
              <span className={styles.face} aria-hidden="true" />
              <span className={styles.who}>
                <b>Muhammad Khalid Makki</b>
                <small>
                  <i className={styles.online} /> Creator of this tool · replies on WhatsApp
                </small>
              </span>
              <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close chat">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className={styles.thread}>
              {step === 0 ? (
                <div className={styles.typing} aria-label="Typing">
                  <i /><i /><i />
                </div>
              ) : null}
              {step >= 1 ? (
                <motion.p className={styles.bubble} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  Hi 👋 I built this planner. If the numbers raise questions or you want a plan built around your project, I&apos;m here.
                </motion.p>
              ) : null}
              {step >= 2 ? (
                <motion.p className={styles.bubble} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  What would you like help with?
                </motion.p>
              ) : null}
            </div>

            {step >= 2 ? (
              <motion.div className={styles.topics} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {TOPICS.map((t) => (
                  <a key={t.label} className={styles.chip} href={wa(t.text, context)} target="_blank" rel="noopener noreferrer">
                    {t.label}
                  </a>
                ))}
              </motion.div>
            ) : null}

            <a className={styles.cta} href={wa("I'd like to talk about my plan.", context)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20} aria-hidden="true" />
              Chat on WhatsApp
            </a>
            <p className={styles.fine}>Opens WhatsApp with your message ready to send. Nothing is sent until you press send.</p>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!open && nudge ? (
          <motion.button key="nudge" type="button" className={styles.nudge} onClick={() => setOpen(true)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.35 }}>
            Need an expert? <b>Ask me</b>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <motion.button type="button" className={styles.fab} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close chat" : `Chat with ${NAME}, creator of this tool`} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, type: "spring", stiffness: 300, damping: 20 }}>
        <span className={styles.fabPhoto} aria-hidden="true" />
        <span className={styles.fabDot} aria-hidden="true" />
      </motion.button>
    </div>
  );
}
