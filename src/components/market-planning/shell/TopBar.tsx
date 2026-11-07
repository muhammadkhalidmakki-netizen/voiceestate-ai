"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import * as Switch from "@radix-ui/react-switch";
import { Command } from "cmdk";
import { motion } from "motion/react";
import { BarChart3, Clock, Globe2, Languages, LogOut, Moon, Search, SlidersHorizontal, Sun, User, type LucideIcon } from "lucide-react";
import { logout } from "@/app/dubai/actions";
import { usePlanner } from "../planner-context";
import { COUNTRIES, marketClassLabel, matureCpl } from "@/lib/market-planning/catalog";
import { portalContainer, useTheme } from "./theme";
import s from "./shell.module.css";

const SECTIONS = [
  { id: "plan", label: "Plan", Icon: SlidersHorizontal },
  { id: "markets", label: "Markets", Icon: Globe2 },
  { id: "languages", label: "Languages", Icon: Languages },
  { id: "forecast", label: "Forecast", Icon: BarChart3 },
  { id: "timeline", label: "Timeline", Icon: Clock },
] as const;

export type NavItem = { id: string; label: string; Icon: LucideIcon; /** Only shown in the phone side strip. */ phoneOnly?: boolean };

function useActiveSection(): string {
  const [active, setActive] = useState<string>("plan");
  useEffect(() => {
    const els = SECTIONS.map((x) => document.getElementById(x.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return active;
}

const PALETTE = ["#3b7bff", "#12b76a", "#f59a23", "#8b6cf0", "#e5484d", "#1fb0c4"];
const accountColor = (name: string) => PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export default function TopBar({
  onNavigate,
  items = SECTIONS as unknown as NavItem[],
  activeId,
  extraEnd,
  account,
  hideAccount = false,
}: {
  onNavigate: (id: string) => void;
  /** Navigation items. Defaults to the section links used by /dubai/analysis. */
  items?: NavItem[];
  /** Controlled active item. When omitted, the active section follows scrolling. */
  activeId?: string;
  /** Extra controls rendered before the search and account buttons. */
  extraEnd?: React.ReactNode;
  /** Who is signed in: shown on the account button and at the top of its menu. */
  account?: { name: string; admin: boolean };
  /** A shared plan has no signed-in person: no account menu. */
  hideAccount?: boolean;
}) {
  const scrolled = useActiveSection();
  const active = activeId ?? scrolled;
  const [palette, setPalette] = useState(false);
  const [theme, setTheme] = useTheme();
  const { openDetail, state, rows } = usePlanner();

  const go = useCallback(
    (id: string) => {
      setPalette(false);
      onNavigate(id);
    },
    [onNavigate],
  );

  return (
    <header className={s.top}>
      <div className={s.brand}>Dubai Market Planning</div>

      <nav className={s.capsule} aria-label="Sections">
        {items.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              className={`${s.navItem} ${on ? s.navItemOn : ""} ${(items.find((x) => x.id === id) as NavItem | undefined)?.phoneOnly ? s.navPhoneOnly : ""}`}
              aria-current={on ? "true" : undefined}
              aria-label={label}
              onClick={() => go(id)}
            >
              {on ? <motion.span layoutId="nav-active" className={s.navActive} transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <Icon size={18} strokeWidth={1.9} className={s.navIcon} aria-hidden="true" />
              {on ? <span className={s.navLabel}>{label}</span> : <span className={s.navLabelHidden}>{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={s.end}>
        {extraEnd}

        {hideAccount ? null : <Popover.Root>
          <Popover.Trigger className={s.avatar} aria-label={account ? `Account: ${account.name}` : "Account and appearance"} style={account ? { background: accountColor(account.name), color: "#ffffff" } : undefined}>
            {account ? <b className={s.initial}>{account.name.charAt(0).toUpperCase()}</b> : <User size={18} strokeWidth={1.9} aria-hidden="true" />}
          </Popover.Trigger>
          <Popover.Portal container={portalContainer()}>
            <Popover.Content className={s.popover} align="end" sideOffset={10}>
              {account ? (
                <div className={s.who}>
                  <span className={s.whoDot} style={{ background: accountColor(account.name) }} aria-hidden="true">
                    {account.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={s.whoText}>
                    <b>{account.name}</b>
                    <small>{account.admin ? "Administrator" : "Client"}</small>
                  </span>
                </div>
              ) : null}
              {account?.admin ? (
                <a className={s.menuLink} href="/dubai/admin">
                  <User size={16} aria-hidden="true" />
                  Manage users
                </a>
              ) : null}
              <p className={s.popTitle}>Workspace</p>
              <label className={s.switchRow}>
                <span className={s.switchLabel}>
                  {theme === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
                  Dark theme
                </span>
                <Switch.Root
                  className={s.switch}
                  checked={theme === "dark"}
                  onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                  aria-label="Dark theme"
                >
                  <Switch.Thumb className={s.switchThumb} />
                </Switch.Root>
              </label>
              <form action={logout}>
                <button type="submit" className={s.signOut}>
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </button>
              </form>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>}
      </div>

      <Dialog.Root open={palette} onOpenChange={setPalette}>
        <Dialog.Portal container={portalContainer()}>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content className={s.palette} aria-describedby={undefined}>
            <Dialog.Title className={s.srOnly}>Search</Dialog.Title>
            <Command label="Search countries and sections" loop>
              <div className={s.cmdInputRow}>
                <Search size={18} aria-hidden="true" />
                <Command.Input className={s.cmdInput} placeholder="Search 249 countries or jump to a section" />
              </div>
              <Command.List className={s.cmdList}>
                <Command.Empty className={s.cmdEmpty}>No match.</Command.Empty>
                <Command.Group heading="Jump to">
                  {items.map(({ id, label }) => (
                    <Command.Item key={id} value={`section ${label}`} className={s.cmdItem} onSelect={() => go(id)}>
                      {label}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Countries">
                  {COUNTRIES.map((c) => {
                    const inPlan = c.iso2 in state.shares;
                    return (
                      <Command.Item
                        key={c.iso2}
                        value={`${c.name} ${c.iso2}`}
                        className={s.cmdItem}
                        onSelect={() => {
                          setPalette(false);
                          openDetail({ kind: "country", iso2: c.iso2 });
                        }}
                      >
                        <span>{c.name}</span>
                        <span className={s.cmdMeta}>
                          {inPlan ? "In plan · " : ""}
                          {matureCpl(c) ? "CPL benchmark" : marketClassLabel(c)}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              </Command.List>
              <p className={s.cmdFoot}>{rows.length} markets in your plan · Enter opens a country&rsquo;s details</p>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
