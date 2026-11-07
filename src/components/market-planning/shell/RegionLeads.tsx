"use client";

import { useState } from "react";
import { motion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { usePlanner } from "../planner-context";
import AnimatedNumber from "../AnimatedNumber";
import RegionCountries from "../charts/RegionCountries";
import { portalContainer } from "./theme";
import { normalizeShares, roundedPercents } from "@/lib/market-planning/model";
import { fmtCpl } from "@/lib/market-planning/format";
import { CONFIDENCE_LABEL, LEARNING_CPL, cplProvenance } from "@/lib/market-planning/catalog";
import ui from "../ui.module.css";
import s from "./hero.module.css";

/**
 * Estimated leads by region: how many leads each region brings and its share of the total.
 * Click a region for a popup with its countries. Regions with no CPL benchmark yet are listed as
 * research pending, never as zero.
 */
export default function RegionLeads({ countUp = true }: { countUp?: boolean }) {
  const { regions, plan, focus, setFocus, openDetail, dispatch, pct: planPct, rows } = usePlanner();
  const [openRegion, setOpenRegion] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  if (!plan.valid) return null;

  const known = regions.filter((r) => r.leads.lo !== null && r.leads.lo > 0);
  const pending = regions.filter((r) => r.leads.lo === null);
  if (known.length === 0) return null;

  const sorted = [...known].sort((a, b) => (b.leads.lo as number) - (a.leads.lo as number));
  const max = Math.max(...sorted.map((r) => r.leads.lo as number));
  const total = sorted.reduce((a, r) => a + (r.leads.lo as number), 0);
  // Whole-number percentages of the total that always add up to 100.
  const pct = roundedPercents(normalizeShares(Object.fromEntries(sorted.map((r) => [r.region, r.leads.lo as number]))));
  const anyOpen = sorted.some((r) => r.leads.hi === null);

  const dialogRegion = openRegion ? regions.find((r) => r.region === openRegion) ?? null : null;
  const regionTotal = dialogRegion ? dialogRegion.markets.reduce((a, m) => a + (m.leads.lo ?? 0), 0) : 0;
  const countryPct = dialogRegion
    ? roundedPercents(
        normalizeShares(Object.fromEntries(dialogRegion.markets.filter((m) => (m.leads.lo ?? 0) > 0).map((m) => [m.iso2, m.leads.lo as number]))),
      )
    : {};

  // No country is picked until the user taps one.
  const selected = dialogRegion ? (dialogRegion.markets.find((m) => m.iso2 === pick) ?? null) : null;

  return (
    <div>
      <ul className={s.rl} aria-label="Estimated leads by region">
        {sorted.map((r, i) => {
          const on = focus?.kind === "region" && focus.region === r.region;
          const dim = focus?.kind === "region" && !on;
          return (
            <li key={r.region}>
              <button
                type="button"
                className={`${s.rlRow} ${on ? s.rlOn : ""} ${dim ? s.rlDim : ""}`}
                aria-haspopup="dialog"
                aria-label={`${r.region}: about ${Math.round(r.leads.lo as number)} leads, ${pct[r.region]} percent of the total. Open the countries.`}
                onClick={() => {
                  setFocus({ kind: "region", region: r.region });
                  setPick(null);
                  setOpenRegion(r.region);
                }}
              >
                <span className={s.rlName}>{r.region}</span>
                <span className={s.rlTrack} aria-hidden="true">
                  <motion.span
                    className={s.rlFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${((r.leads.lo as number) / max) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className={s.rlVal}>
                  <AnimatedNumber value={r.leads.lo as number} kind="int" fromZero={countUp} />
                  {r.leads.hi === null ? "+" : ""}
                </span>
                <span className={s.rlPct}>
                  <AnimatedNumber value={(pct[r.region] ?? 0) / 100} kind="pct" fromZero={countUp} />
                </span>
              </button>
            </li>
          );
        })}
        {pending.map((r) => (
          <li key={r.region} className={s.rlPending}>
            <span className={s.rlName}>{r.region}</span>
            <span className={s.rlPendingTxt}>CPL research pending</span>
          </li>
        ))}
      </ul>
      <p className={s.tileFoot}>
        Tap a region for its countries{anyOpen ? ". A + means at least: some benchmarks have no upper bound" : ""}.
      </p>

      <Dialog.Root open={openRegion !== null} onOpenChange={(o) => !o && setOpenRegion(null)}>
        <Dialog.Portal container={portalContainer()}>
          <Dialog.Overlay className={s.dlgOverlay} />
          <Dialog.Content className={s.dlg} aria-describedby={undefined}>
            <div className={s.dlgHead}>
              <Dialog.Title className={s.dlgTitle}>{dialogRegion?.region ?? "Region"}: leads by country</Dialog.Title>
              <Dialog.Close className={s.dlgClose} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </div>
            {dialogRegion ? (
              <div className={s.dlgBody}>
                <div className={s.rstats}>
                  <div className={s.rstat}>
                    <span className={s.rstatLabel}>Estimated leads</span>
                    <span className={s.rstatVal}>
                      ≈ <AnimatedNumber value={regionTotal} kind="int" fromZero />
                      {dialogRegion.leads.hi === null ? "+" : ""}
                    </span>
                  </div>
                  <div className={s.rstat}>
                    <span className={s.rstatLabel}>Share of all leads</span>
                    <span className={s.rstatVal}>
                      <AnimatedNumber value={total > 0 ? regionTotal / total : 0} kind="pct" fromZero />
                    </span>
                  </div>
                  <div className={s.rstat}>
                    <span className={s.rstatLabel}>Region budget</span>
                    <span className={s.rstatVal}>
                      <AnimatedNumber value={dialogRegion.spend.hi ?? 0} kind="aed" fromZero />
                    </span>
                    <span className={s.rstatSub}>{Math.round(dialogRegion.share * 100)}% of your budget</span>
                  </div>
                  <div className={s.rstat}>
                    <span className={s.rstatLabel}>Blended CPL</span>
                    <span className={s.rstatVal}>
                      {regionTotal > 0 ? (
                        <>
                          {dialogRegion.leads.hi === null ? "≤ " : ""}
                          <AnimatedNumber
                            value={dialogRegion.markets.filter((m) => m.cpl).reduce((a, m) => a + (m.spend.hi ?? 0), 0) / regionTotal}
                            kind="aed"
                            fromZero
                          />
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <p className={s.rsub}>
                    Leads by country <span>Tap a country for its details</span>
                  </p>
                  <RegionCountries
                    markets={dialogRegion.markets}
                    pct={countryPct}
                    selected={selected?.iso2 ?? null}
                    onSelect={(iso2) => setPick((cur) => (cur === iso2 ? null : iso2))}
                  />
                </div>

                {selected ? (
                  <div className={s.rpanel}>
                    <div className={s.rpanelHead}>
                      <div>
                        <h3 className={s.rpanelTitle}>{selected.country.name}</h3>
                        <span className={s.rpanelSub}>
                          {selected.leads.lo === null
                            ? "CPL research pending: no leads can be estimated yet"
                            : `≈ ${Math.round(selected.leads.lo)}${selected.leads.hi === null ? "+" : ""} leads · ${countryPct[selected.iso2] ?? 0}% of ${dialogRegion.region}`}
                        </span>
                      </div>
                    </div>

                    <dl className={s.rfacts}>
                      <div>
                        <dt>Budget in your plan</dt>
                        <dd>
                          {planPct[selected.iso2] ?? 0}% · <AnimatedNumber value={selected.spend.hi ?? 0} kind="aed" fromZero />
                          <span> · set in the strategy builder</span>
                        </dd>
                      </div>
                      <div>
                        <dt>CPL reference</dt>
                        <dd>
                          {selected.cpl ? fmtCpl(selected.cpl) : "Research pending"}
                          {selected.cpl?.source === "client-regional-proxy" ? (
                            <span> · your benchmark{cplProvenance(selected.iso2) ? `, ${CONFIDENCE_LABEL[cplProvenance(selected.iso2)!.confidence] ?? ""}` : ""}</span>
                          ) : selected.cpl?.source === "modelled-estimate" ? (
                            <span> · estimate, low confidence (includes a safety margin)</span>
                          ) : selected.cpl ? (
                            <span> · your own figure</span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt>Learning-phase CPL</dt>
                        <dd>{LEARNING_CPL[selected.iso2] !== undefined ? `AED ${LEARNING_CPL[selected.iso2]}` : "Not yet supplied"}</dd>
                      </div>
                    </dl>

                    <div className={s.ractions}>
                      <button type="button" className={ui.btnLine} onClick={() => setPick(null)}>
                        Clear selection
                      </button>
                      <button
                        type="button"
                        className={ui.btnSoft}
                        onClick={() => {
                          setOpenRegion(null);
                          openDetail({ kind: "country", iso2: selected.iso2 });
                        }}
                      >
                        Full evidence
                      </button>
                      <button
                        type="button"
                        className={ui.btnLine}
                        disabled={rows.length <= 1}
                        onClick={() => {
                          dispatch({ type: "toggleMarket", iso2: selected.iso2 });
                          setPick(null);
                        }}
                      >
                        Remove from plan
                      </button>
                    </div>
                  </div>
                ) : null}

                <p className={s.chartCaption}>CPLs are regional client benchmarks used as country proxies, not measured country results.</p>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
