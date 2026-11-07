"use client";

import { PanelHead } from "../ui";
import EvidenceFunnel from "../charts/EvidenceFunnel";
import WorldMap from "../charts/WorldMap";
import { HexMap } from "../micro";
import ui from "../ui.module.css";
import f from "./forecast.module.css";

/** Geography and research coverage: world map, honeycomb of the registry, evidence funnel. */
export default function CoveragePanel() {
  return (
    <section className={ui.panel} id="coverage" aria-labelledby="coverage-title">
      <PanelHead
        id="coverage-title"
        title="Where your markets are"
        copy="Your selected markets on the map, and how much evidence exists for every country in the registry. Select a country to open its details."
      />
      <div className={f.subhead}>
        <h3 className={f.h3}>Selected markets by share of budget</h3>
        <span className={f.hint}>Hatched outline: no CPL yet</span>
      </div>
      <WorldMap />
      <p className={ui.subtle} style={{ margin: "6px 2px 0" }}>
        Very small countries and territories may not be visible at this map scale. Use the honeycomb below or
        the search to reach them.
      </p>

      <div className={f.coverageGrid}>
        <div>
          <div className={f.subhead}>
            <h3 className={f.h3}>Research coverage by country</h3>
          </div>
          <HexMap />
        </div>
        <div>
          <div className={f.subhead}>
            <h3 className={f.h3}>Evidence funnel</h3>
            <span className={f.hint}>Coverage, not conversion</span>
          </div>
          <EvidenceFunnel />
        </div>
      </div>
    </section>
  );
}
