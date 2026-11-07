"use client";

import { useActionState, useMemo, useState } from "react";
import { createUserAction, deleteUserAction, resetPasswordAction, type AdminState } from "@/app/dubai/admin/actions";
import s from "./admin.module.css";

type U = { username: string; name: string; createdAt: string; plans: number };

const COLORS = ["#3b7bff", "#12b76a", "#f59a23", "#8b6cf0", "#e5484d", "#1fb0c4"];
const colorOf = (u: string) => COLORS[[...u].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const randomPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => chars[b % chars.length]).join("");
};
const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function PasswordField({ name, id, label, value, onChange }: { name: string; id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <div className={s.inputWrap}>
        <input id={id} className={s.input} name={name} type="text" required minLength={8} maxLength={100} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder="8 or more characters" style={{ paddingRight: 84 }} />
        <button type="button" className={s.inline} onClick={() => onChange(randomPassword())}>
          Generate
        </button>
      </div>
    </div>
  );
}

function UserRow({ u }: { u: U }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [state, action, pending] = useActionState(resetPasswordAction, {} as AdminState);
  return (
    <li className={s.row}>
      <div className={s.rowMain}>
        <span className={s.avatar} style={{ background: colorOf(u.username) }} aria-hidden="true">
          {(u.name || u.username).charAt(0).toUpperCase()}
        </span>
        <div className={s.who}>
          <b>{u.name}</b>
          <div className={s.chips}>
            <span>Username: {u.username}</span>
            <span>Added {date(u.createdAt)}</span>
            <span className={s.badge}>
              {u.plans} saved {u.plans === 1 ? "plan" : "plans"}
            </span>
          </div>
        </div>
        <div className={s.rowActions}>
          <button type="button" className={s.ghost} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Change password"}
          </button>
          <form
            action={deleteUserAction}
            onSubmit={(e) => {
              if (!window.confirm(`Delete ${u.name} (${u.username})? They can no longer sign in. Their saved plans stay and you can still see them.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="username" value={u.username} />
            <button type="submit" className={s.danger}>
              Delete
            </button>
          </form>
        </div>
      </div>
      {open ? (
        <form action={action} className={s.panel}>
          <input type="hidden" name="username" value={u.username} />
          <input className={s.input} name="password" type="text" required minLength={8} maxLength={100} autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" aria-label={`New password for ${u.username}`} />
          <button type="button" className={s.ghost} onClick={() => setPw(randomPassword())}>
            Generate
          </button>
          <button type="submit" className={s.primary} disabled={pending}>
            Save password
          </button>
          {state.error ? <p className={s.err} role="alert">{state.error}</p> : null}
          {state.done ? <p className={s.ok} role="status">{state.done} Share it with them now: it cannot be shown again.</p> : null}
        </form>
      ) : null}
    </li>
  );
}

export default function AdminUsers({ users, available }: { users: U[]; available: boolean }) {
  const [state, action, pending] = useActionState(createUserAction, {} as AdminState);
  const [pw, setPw] = useState("");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? users.filter((u) => `${u.name} ${u.username}`.toLowerCase().includes(n)) : users;
  }, [users, q]);
  const totalPlans = users.reduce((a, u) => a + u.plans, 0);

  return (
    <>
      <div className={s.stat} style={{ marginBottom: 14 }}>
        <div className={s.statBox}>
          <b>{users.length}</b>
          <span>{users.length === 1 ? "client user" : "client users"}</span>
        </div>
        <div className={s.statBox}>
          <b>{totalPlans}</b>
          <span>plans saved</span>
        </div>
      </div>

      {!available ? <p className={s.err} style={{ marginBottom: 14 }}>User storage is not set up on this server yet, so users cannot be created.</p> : null}

      <section className={s.card} aria-labelledby="add-user">
        <h2 id="add-user" className={s.cardTitle}>
          Add a user
        </h2>
        <form action={action}>
          <div className={s.addGrid}>
            <div className={s.field}>
              <label htmlFor="u-name">Client name</label>
              <input id="u-name" className={s.input} name="name" maxLength={60} placeholder="For example, Prophunters" />
            </div>
            <div className={s.field}>
              <label htmlFor="u-user">Username</label>
              <input id="u-user" className={s.input} name="username" required minLength={3} maxLength={32} autoComplete="off" placeholder="lower case, no spaces" />
            </div>
            <PasswordField id="u-pass" name="password" label="Password" value={pw} onChange={setPw} />
          </div>
          <div className={s.actions}>
            <button type="submit" className={s.primary} disabled={pending || !available}>
              Create user
            </button>
            {state.error ? <p className={s.err} role="alert">{state.error}</p> : null}
            {state.done ? <p className={s.ok} role="status">{state.done}</p> : null}
          </div>
        </form>
        <p className={s.hint}>Passwords are stored as a salted hash, so nobody (including you) can read them later. Copy the password before you leave this page, or set a new one when needed.</p>
      </section>

      <section className={s.card} aria-labelledby="all-users">
        <div className={s.listHead}>
          <h2 id="all-users" className={s.cardTitle}>
            Users
          </h2>
          {users.length > 4 ? <input className={`${s.input} ${s.search}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a user" aria-label="Find a user" /> : null}
        </div>
        {users.length === 0 ? (
          <p className={s.empty}>No client users yet. Add the first one above. Until then only you can sign in.</p>
        ) : shown.length === 0 ? (
          <p className={s.empty}>No user matches &ldquo;{q}&rdquo;.</p>
        ) : (
          <ul className={s.list}>
            {shown.map((u) => (
              <UserRow key={u.username} u={u} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
