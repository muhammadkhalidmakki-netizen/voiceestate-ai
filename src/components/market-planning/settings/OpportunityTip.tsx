"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { portalContainer } from "../shell/theme";
import { opportunityOf } from "@/lib/market-planning/intel/opportunity";
import m from "./settings.module.css";

/** Hover or focus a market to see why it scores as it does: six dimensions, their weights and what is missing. */
export default function OpportunityTip({ iso2, name, children }: { iso2: string; name: string; children: React.ReactNode }) {
  const opp = opportunityOf(iso2);
  if (!opp) return <>{children}</>;
  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal container={portalContainer()}>
          <Tooltip.Content className={m.tip} side="left" align="center" sideOffset={10} collisionPadding={12}>
            <div className={m.tipHead}>
              <b>{name}</b>
              <span>{Math.round(opp.total)}/100</span>
            </div>
            <ul className={m.tipList}>
              {opp.parts.map((p) => (
                <li key={p.key}>
                  <span className={m.tipLabel}>
                    {p.label} <em>{Math.round(p.weight * 100)}%</em>
                  </span>
                  <span className={m.tipTrack} aria-hidden="true">
                    <span data-missing={p.score === null ? "true" : undefined} style={{ width: `${p.score ?? 40}%` }} />
                  </span>
                  <b>{p.score === null ? "no data" : Math.round(p.score)}</b>
                </li>
              ))}
            </ul>
            {opp.accessFactor < 0.99 ? <p className={m.tipNote}>Weak capital access (controls, sanctions or currency stress) lowers the total by {Math.round((1 - opp.accessFactor) * 100)}%.</p> : null}
            <p className={m.tipNote}>
              Each dimension is 0 to 100. Missing data counts as a cautious 40 and lowers the total{opp.boost > 0 ? `; +${opp.boost} from your client results` : ""}. An estimate of potential, not a count of buyers or sales.
            </p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
