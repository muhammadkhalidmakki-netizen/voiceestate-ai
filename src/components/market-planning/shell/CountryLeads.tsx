"use client";

import { usePlanner } from "../planner-context";
import Flag from "../settings/Flag";
import AnimatedNumber from "../AnimatedNumber";
import { cplShort, leadsText, marketStats, sortStats } from "../breakdown/stats";
import s from "./hero.module.css";

const SHOWN = 5;

/**
 * Estimated leads by country, most leads first, with each country's cost per lead. Click a country for its
 * chart. Markets without a cost per lead yet are listed last as "pending", never as zero.
 */
export default function CountryLeads({
  onOpenCountry,
  onOpenAll,
}: {
  onOpenCountry: (iso2: string) => void;
  onOpenAll: () => void;
}) {
  const { rows, state, plan } = usePlanner();
  if (!plan.valid) return null;
  const list = sortStats(marketStats(rows, state.closeRate, state.languages), "leads");
  const shown = list.slice(0, SHOWN);
  const rest = list.length - shown.length;

  return (
    <div className={s.cl}>
      <div className={s.clHead}>
        <span>Market</span>
        <span>Leads</span>
        <span>CPL</span>
      </div>
      <ol className={s.clList} aria-label="Estimated leads by country">
        {shown.map((m) => (
          <li key={m.iso2}>
            <button
              type="button"
              className={s.clRow}
              aria-label={`${m.name}: ${m.leadsLo === null ? "no lead estimate yet" : `about ${leadsText(m)} leads`}, cost per lead ${m.row.cpl ? cplShort(m.row.cpl) : "pending"}. Open its chart.`}
              onClick={() => onOpenCountry(m.iso2)}
            >
              <span className={s.clName}>
                <Flag iso2={m.iso2} name={m.name} />
                <span>{m.name}</span>
              </span>
              <span className={s.clVal}>
                <b>
                  {m.leadsLo === null ? (
                    "pending"
                  ) : (
                    <>
                      <AnimatedNumber value={Math.round(m.leadsLo)} kind="int" duration={0.9} fromZero />
                      {m.leadsMore ? "+" : ""}
                    </>
                  )}
                </b>
              </span>
              <em className={s.clCpl}>{m.row.cpl ? cplShort(m.row.cpl) : "pending"}</em>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={s.invMore} onClick={onOpenAll}>
        {rest > 0 ? `+${rest} more markets · ` : ""}See the full breakdown
      </button>
      <p className={s.invNote}>CPL = cost per lead, in AED. A + means at least.</p>
    </div>
  );
}
