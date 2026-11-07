# Interaction and Filter Behavior Reference

## 1. Why this file exists

The supplied Time Homes dashboard screenshots are the primary reference for **interaction quality and cross-filter behavior**. The Zassk, Vixora, and Executive Business Dashboard references remain visual-quality references for component craftsmanship, composition, and premium SaaS presentation.

Use the references for different purposes:

- **Time Homes dashboard:** how controls, filters, charts, KPI values, tables, and detail panels stay connected and respond immediately to user input.
- **Zassk:** KPI card craft, mini-visualizations, subtle gradients, and distinctive card composition.
- **Vixora:** restrained visual hierarchy, clean surfaces, spacing, and analytical composition.
- **Executive Business Dashboard:** information density, chart hierarchy, and overall dashboard composition.

Do not copy Time Homes branding, logo, colors, campaign data, CRM metrics, or its exact layout. This is a different product: a Dubai off-plan market planning tool for Prophunters.

## 2. Core interaction standard

The planner must behave like a connected interactive application, not a report with decorative controls.

When a user changes a meaningful input, all dependent outputs must update immediately in the browser without a full page reload. Keep a single coherent scenario state and derive the displayed values from that state. Avoid separate, competing state values that can drift out of sync.

The experience should feel immediate and predictable:

1. User changes a control.
2. The selected input updates visibly.
3. The forecast calculations recompute.
4. KPI values, breakdowns, visualizations, explanations, and comparison outputs update together.
5. The interface preserves the user's other selections.

Use smooth, restrained transitions for changing values and chart states. Do not delay basic calculations behind a loading animation. Use loading states only when genuinely waiting for research/API/server work.

## 3. The planner's connected state

At minimum, the scenario state should represent:

- Planning mode: monthly budget or monthly lead target.
- Budget or lead target value.
- Selected countries.
- Selected regions (derived from countries unless the user explicitly chooses a region-level option).
- Agent-supported languages.
- Market allocation shares.
- Meta/Google budget allocation.
- Optional advanced assumptions, clearly separated from verified client data.
- Scenario comparison selection, if the comparison feature is enabled.

There should be one source of truth for each user-controlled input. Derived results should be calculated from the current scenario rather than independently edited.

## 4. Required interaction behavior

### A. Budget / lead-target mode

- Switching to **Plan by budget** makes budget the editable primary input and calculates the implied lead target.
- Switching to **Plan by lead target** makes leads the editable primary input and calculates the required budget.
- Recommended presets populate the same primary input as a custom value.
- Custom override remains possible.
- Switching modes must not unexpectedly erase the user's selected markets, languages, or channel allocation.
- The displayed forecast must clearly identify which value is the user's target and which values are calculated estimates.

### B. Recommended markets and country selection

- Load the recommended portfolio by default; do not make the client start with an empty selector.
- Allow multi-select, deselect, search, region expansion, and country-level editing.
- Adding or removing a country must update the market mix and all forecast outputs affected by the selected markets.
- Selecting a region may select its included countries only when that action is clearly communicated.
- Do not silently replace a country-level selection with a region proxy without showing the benchmark limitation.
- Unsupported or unresearched country data must show an evidence/coverage state, not a fabricated CPL.

### C. Agent language selection

- Support multi-select languages.
- Selecting or removing a language must update the recommended market opportunities and relevant audience explanations.
- Language selection must include diaspora/expatriate audiences where evidence supports them, not just countries where the language is official.
- Do not treat national language prevalence as proof of reachable audience size, Dubai property demand, or conversion intent.
- Show why a market appears in the recommendation and the confidence/source basis.

### D. Meta / Google allocation

- The two percentages must always total 100%.
- Changing one channel's allocation automatically adjusts the other.
- Both AED spend amounts update immediately from the total media budget.
- If total budget changes, preserve the allocation percentages and recalculate AED spend.
- Do not calculate platform-level leads from regional blended CPL unless validated channel-specific CPL inputs are available.
- If channel-specific assumptions are enabled, make the assumption editable and visibly label it as directional/unverified.

### E. Campaign maturity comparison

- The client does not select a single maturity state as a required planning input.
- Show New/Learning versus Mature side by side wherever both are supported by data.
- Europe can use the supplied learning CPL of AED 120 and mature CPL of AED 50.
- Other regions must show learning CPL as unconfirmed until a real benchmark is supplied.
- Changing other inputs must update both scenario columns wherever their benchmark data permits.

### F. Forecast outputs

The forecast is the primary source of truth. Values must be derived from the active inputs and current benchmark registry.

The connected outputs include, where supported:

- Monthly media investment.
- Estimated lead target / estimated leads.
- Estimated blended CPL.
- Learning versus mature comparison.
- Meta and Google budget allocation.
- Country/region budget allocation.
- Country/region lead estimates.
- Data coverage and confidence indicators.
- Calculation explanations.

Every displayed number must be traceable to a formula and a data source/assumption. If the data does not support a number, show an unavailable/unconfirmed state instead of a plausible-looking placeholder.

### G. Sales maturity timeline

- Keep the supplied 19-case historical timing pattern visually separate from the acquisition forecast.
- The 30/60/90/120/270-day checkpoints may be shown as historical observations.
- Do not convert these milestones into projected sales counts until the denominator and overall lead-to-sale rate are confirmed.
- If the user changes monthly lead volume, the chart may illustrate a lead cohort timeline only if the visualization clearly explains that it is a timing pattern, not a sales-volume forecast.

## 5. Cross-filtering and drill-down behavior

The Time Homes reference demonstrates that a selection in one part of the dashboard can affect other parts. Adapt that interaction model to planning:

- Clicking a country in the market breakdown should focus/highlight that country across related market allocation and forecast views.
- Clicking a region should focus the relevant countries and their combined allocation.
- Clicking a channel allocation should reveal its spend breakdown and any supported benchmark explanation.
- Clicking a forecast metric should open an explanation/drill-down showing inputs, formula, source, and confidence.
- Opening a detail drawer must not reset the current scenario.
- Closing a drawer must return to the same scenario and scroll/filter context.

Use drawers or focused detail panels for deeper explanations rather than navigating away from the planning workspace for every interaction.

## 6. Scenario comparison

Where implemented, scenario comparison should work like a true side-by-side comparison:

- Preserve the current scenario as the baseline.
- Let the client duplicate it into an alternative scenario.
- Allow changes to the alternative without overwriting the baseline.
- Compare investment, estimated leads, blended CPL, country mix, and maturity assumptions.
- Label the difference as absolute and/or percentage change only when the underlying values are comparable.
- Make it easy to return to editing the primary scenario.

## 7. Data and demo-state honesty

The Time Homes screenshots include an explicit sample-data notice. Follow the same honesty standard.

- If the planner uses seeded/demo values, label them as sample or illustrative.
- Do not show a fake "Live" status, fake last-sync time, or fake connected-source indicator.
- Instant client-side recalculation is not the same as live external data synchronization.
- Distinguish client-provided benchmarks, research estimates, editable assumptions, and missing data.
- Do not use mock figures in a production forecast without an explicit sample-data label.

## 8. Visual behavior

Interaction quality should reinforce the premium visual design:

- Use clear selected, hover, focus, disabled, and expanded states.
- Use compact segmented controls, polished dropdowns, search, sliders, and multi-selects.
- Animate value changes subtly; avoid flicker, bouncing, or excessive motion.
- Make selected markets visually distinct without overwhelming the user with color.
- Use consistent colors for Meta and Google only where they aid recognition; do not force platform colors onto unrelated charts.
- Use inline explanatory text and tooltips for unfamiliar metrics.
- Ensure all controls work with keyboard navigation and have accessible labels.
- Preserve layout stability when numbers change or details expand.

## 9. Acceptance tests

The implementation is not accepted merely because controls look clickable. Test the following behaviors in the browser:

1. Enter a monthly budget: estimated leads and all dependent budget outputs recalculate.
2. Switch to lead-target mode: required investment recalculates and the selected countries/languages remain intact.
3. Apply a recommended budget preset: it produces the same output as entering that exact amount manually.
4. Apply a recommended lead preset: required investment recalculates correctly.
5. Change the country selection: country mix, market allocation, weighted CPL, and total lead estimate update consistently where data exists.
6. Select multiple countries: all selections remain visible and calculations use the combined allocation.
7. Select Arabic or French: relevant language-market recommendations update, including diaspora opportunities where supported.
8. Change Meta allocation: Google allocation adjusts so the total remains 100%, and both AED amounts update.
9. Change total budget after channel allocation: percentages remain constant and spend amounts update.
10. Compare learning versus mature: Europe changes according to AED 120 versus AED 50; unsupported regions remain explicitly unconfirmed.
11. Open a metric explanation: it displays the correct formula, source classification, and assumptions.
12. Open and close a country/channel detail drawer: the active scenario is preserved.
13. Refresh the browser: authentication and scenario persistence behave according to the agreed product requirements; do not claim persistence if it is not implemented.
14. No interaction requires a full page reload for normal scenario changes.
15. No decorative control, chart, or button is inert.
16. No unsupported metric is populated with invented data.

## 10. Final implementation principle

Use the Time Homes dashboard as proof of the interaction standard expected: coherent controls, instant cross-component updates, useful drill-downs, and no full-page refresh for normal filtering. Use the other supplied dashboards as the visual-quality benchmark.

The result must combine both: **premium visual craftsmanship and genuinely connected interactions**. One without the other is not sufficient.
