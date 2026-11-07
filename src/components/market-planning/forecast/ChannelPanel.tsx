"use client";

import { PanelHead, EvidencePill } from "../ui";
import { usePlanner } from "../planner-context";
import { LiveRange, SplitBar, rampColor } from "../viz";
import { CHANNEL_RATES, EUROPE_PATTERN } from "@/lib/market-planning/catalog";
import { fmtAed } from "@/lib/market-planning/format";
import ui from "../ui.module.css";
import f from "./forecast.module.css";

export default function ChannelPanel() {
  const { state, channel, openDetail, rows } = usePlanner();
  const meta = Math.round(state.metaShare * 100);
  const hasEurope = rows.some((r) => r.country.benchmarkRegion === "Europe");

  return (
    <section className={ui.panel} id="channels" aria-labelledby="channels-title">
      <PanelHead
        id="channels-title"
        title="Channel investment"
        copy="How your monthly investment is distributed across Meta and Google. Allocation changes the spend plan; platform-level lead estimates would need channel-specific CPL data."
        right={<EvidencePill kind="assumption" />}
      />
      <SplitBar
        height={22}
        ariaLabel={`Meta ${meta} percent, Google ${100 - meta} percent`}
        segments={[
          { key: "meta", label: "Meta Ads", value: state.metaShare, color: rampColor(1) },
          { key: "google", label: "Google Ads", value: 1 - state.metaShare, color: rampColor(4) },
        ]}
        onSelect={(key) => openDetail({ kind: "channel", channel: key as "meta" | "google" })}
      />
      <div className={f.channels}>
        {(["meta", "google"] as const).map((ch) => (
          <button
            key={ch}
            type="button"
            className={f.channelCard}
            onClick={() => openDetail({ kind: "channel", channel: ch })}
            aria-label={`${ch === "meta" ? "Meta" : "Google"} Ads: open details`}
          >
            <span className={f.channelCardName}>
              <span className={f.swatch} style={{ background: ch === "meta" ? rampColor(1) : rampColor(4) }} />
              {ch === "meta" ? "Meta Ads" : "Google Ads"}
            </span>
            <span className={f.channelCardPct}>{ch === "meta" ? meta : 100 - meta}%</span>
            <span className={f.channelCardAed}>
              <LiveRange range={channel[ch]} kind="aed" fallback="Set a budget" />
            </span>
            <span className={f.channelCardNote}>Platform leads: not estimated</span>
          </button>
        ))}
      </div>
      <p className={ui.subtle} style={{ margin: "12px 2px 0" }}>
        Client working-lead rates (Meta {CHANNEL_RATES.meta_percent_or_above}%+, Google{" "}
        {CHANNEL_RATES.google_percent_or_above}%+) are not used: it is not yet confirmed whether they describe
        raw-to-working leads or raw-to-sale.
        {hasEurope
          ? ` Observed Europe setup: about ${fmtAed(EUROPE_PATTERN.meta_daily_aed)}/day on each platform, an observation rather than a proven optimal split.`
          : ""}
      </p>
    </section>
  );
}
