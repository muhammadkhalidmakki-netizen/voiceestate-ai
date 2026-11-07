"use client";

import AcquisitionOutlook from "../market-planning/forecast/AcquisitionOutlook";
import LanguageOpportunities from "../market-planning/forecast/LanguageOpportunities";
import CoveragePanel from "../market-planning/forecast/CoveragePanel";
import MaturityPanel from "../market-planning/forecast/MaturityPanel";
import v from "./v2.module.css";

/** Deeper analysis: language-led opportunities, lead curve, regions, maturity and the map. */
export default function InsightsTab() {
  return (
    <div className={v.stack}>
      <LanguageOpportunities />
      <AcquisitionOutlook />
      <MaturityPanel />
      <CoveragePanel />
    </div>
  );
}
