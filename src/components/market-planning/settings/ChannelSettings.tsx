"use client";

import { usePlanner } from "../planner-context";
import SettingsDialog from "./SettingsDialog";
import { GoogleLogo, MetaLogo } from "./Logos";
import { LiveRange } from "../viz";
import ui from "../ui.module.css";
import m from "./settings.module.css";

const PRESETS = [
  { meta: 30, label: "30 / 70" },
  { meta: 50, label: "50 / 50" },
  { meta: 70, label: "70 / 30" },
];

/** How the monthly budget is divided between Meta and Google. */
export default function ChannelSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch, channel, openDetail } = usePlanner();
  const meta = Math.round(state.metaShare * 100);
  const google = 100 - meta;
  const set = (value: number) => dispatch({ type: "setMeta", share: Math.min(100, Math.max(0, value)) / 100 });

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Channels"
      lead="Divide the monthly budget between Meta and Google."
      footer={
        <button type="button" className={ui.btnPrimary} onClick={() => onOpenChange(false)}>
          Done
        </button>
      }
    >
      <div className={m.channelCards}>
        <button type="button" className={m.channelCard} onClick={() => openDetail({ kind: "channel", channel: "meta" })}>
          <span className={m.channelHead}>
            <MetaLogo size={22} />
            Meta Ads
          </span>
          <span className={m.channelPct}>{meta}%</span>
          <span className={m.channelAmt}>
            <LiveRange range={channel.meta} kind="aed" fallback="Set a budget" />
          </span>
        </button>
        <button type="button" className={m.channelCard} onClick={() => openDetail({ kind: "channel", channel: "google" })}>
          <span className={m.channelHead}>
            <GoogleLogo size={22} />
            Google Ads
          </span>
          <span className={m.channelPct}>{google}%</span>
          <span className={m.channelAmt}>
            <LiveRange range={channel.google} kind="aed" fallback="Set a budget" />
          </span>
        </button>
      </div>

      <div>
        <p className={m.label}>Meta share of the budget (Google takes the rest)</p>
        <input
          type="range"
          className={ui.slider}
          min={0}
          max={100}
          step={1}
          value={meta}
          aria-label="Meta Ads share of the budget; Google takes the rest"
          aria-valuetext={`Meta ${meta} percent, Google ${google} percent`}
          style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${meta}%, var(--mp-tint-2) ${meta}%)` }}
          onChange={(e) => set(Number(e.target.value))}
        />
        <div className={m.stepRow}>
          <button type="button" className={m.stepBtn} onClick={() => set(meta - 5)} disabled={meta <= 0}>
            − 5% Meta
          </button>
          <div className={m.quick} role="group" aria-label="Quick splits">
            {PRESETS.map((p) => (
              <button key={p.meta} type="button" className={`${m.quickBtn} ${meta === p.meta ? m.quickOn : ""}`} aria-pressed={meta === p.meta} onClick={() => set(p.meta)}>
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className={m.stepBtn} onClick={() => set(meta + 5)} disabled={meta >= 100}>
            + 5% Meta
          </button>
        </div>
      </div>

      <p className={m.hint}>
        Meta and Google costs are not modelled separately yet, so this divides your budget but does not change the estimated leads.
      </p>
    </SettingsDialog>
  );
}
