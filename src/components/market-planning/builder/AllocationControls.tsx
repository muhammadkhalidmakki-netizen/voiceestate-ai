"use client";

import { PanelHead } from "../ui";
import { usePlanner } from "../planner-context";
import { LiveRange, SplitBar, rampColor } from "../viz";
import ui from "../ui.module.css";
import b from "./builder.module.css";

export default function AllocationControls() {
  const { state, dispatch, rows, pct: pcts, channel, openDetail, focus, setFocus } = usePlanner();
  const meta = Math.round(state.metaShare * 100);
  const sorted = [...rows].sort((a, c) => c.share - a.share);

  return (
    <section id="allocation" aria-labelledby="alloc-title">
      <PanelHead
        id="alloc-title"
        title="Allocate your advertising investment"
        copy="Split your budget across markets and across Meta and Google. The combined allocation always equals 100%."
      />

      <div className={b.groupHead}>
        <p className={b.groupLabel}>Budget by market</p>
        <button type="button" className={ui.btnSoft} onClick={() => dispatch({ type: "equalizeShares" })}>
          Equal split
        </button>
      </div>
      <p className={b.note} style={{ marginTop: 0 }}>
        The starting split is an editable planning distribution, equal across your markets. It is not an
        optimized recommendation.
      </p>
      <ul className={b.shareList}>
        {sorted.map((r) => {
          const pct = pcts[r.iso2] ?? 0;
          const focused = focus?.kind === "country" && focus.iso2 === r.iso2;
          return (
            <li key={r.iso2} className={`${b.shareRow} ${focused ? b.rowFocus : ""}`}>
              <button
                type="button"
                className={b.shareName}
                onClick={() => {
                  setFocus({ kind: "country", iso2: r.iso2 });
                  openDetail({ kind: "country", iso2: r.iso2 });
                }}
              >
                {r.country.name}
              </button>
              <input
                type="range"
                className={ui.slider}
                min={0}
                max={100}
                step={1}
                value={pct}
                aria-label={`${r.country.name} share of budget`}
                aria-valuetext={`${pct} percent`}
                style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${pct}%, var(--mp-tint-2) ${pct}%)` }}
                onChange={(e) => dispatch({ type: "setShare", iso2: r.iso2, share: Number(e.target.value) / 100 })}
              />
              <span className={b.sharePct}>{pct}%</span>
            </li>
          );
        })}
      </ul>

      <div className={b.channelBox}>
        <p className={b.groupLabel}>Meta and Google</p>
        <div className={b.channelNums}>
          <div>
            <span className={b.channelName}>Meta Ads</span>
            <span className={b.channelPct}>{meta}%</span>
            <span className={b.channelAed}>
              <LiveRange range={channel.meta} kind="aed" fallback="Set a budget" />
            </span>
          </div>
          <div className={b.channelRight}>
            <span className={b.channelName}>Google Ads</span>
            <span className={b.channelPct}>{100 - meta}%</span>
            <span className={b.channelAed}>
              <LiveRange range={channel.google} kind="aed" fallback="Set a budget" />
            </span>
          </div>
        </div>
        <SplitBar
          height={12}
          ariaLabel={`Meta ${meta} percent, Google ${100 - meta} percent`}
          segments={[
            { key: "meta", label: "Meta Ads", value: state.metaShare, color: rampColor(1) },
            { key: "google", label: "Google Ads", value: 1 - state.metaShare, color: rampColor(4) },
          ]}
          onSelect={(key) => openDetail({ kind: "channel", channel: key as "meta" | "google" })}
        />
        <input
          type="range"
          className={ui.slider}
          min={0}
          max={100}
          step={1}
          value={meta}
          aria-label="Meta Ads share of the budget; Google takes the rest"
          aria-valuetext={`Meta ${meta} percent, Google ${100 - meta} percent`}
          style={{ ["--track" as string]: `linear-gradient(90deg, ${rampColor(1)} ${meta}%, ${rampColor(4)} ${meta}%)` }}
          onChange={(e) => dispatch({ type: "setMeta", share: Number(e.target.value) / 100 })}
        />
        <p className={b.note} style={{ marginTop: 4 }}>
          The 50 / 50 start is a neutral planning default. Your benchmarks are blended regional CPLs, so
          channel-level lead estimates are not calculated.
        </p>
      </div>
    </section>
  );
}
