# 09 — Build Sequence and Acceptance Tests

## Build method

Use a deliberate component-by-component approval workflow. Do not build the full dashboard in one attempt.

## Phase 0 — Inspect, do not redesign

Before changing code:

- Locate `/dubai/analysis` route and authentication guard.
- Locate the current placeholder KPI card and all styles affecting it.
- Identify existing charting, animation, icon and form libraries.
- Read root README and relevant app instructions for real technical constraints.
- Confirm how route-specific CSS can be isolated.
- Do not alter unrelated screens.

Deliver a short implementation note before coding if the current code has a conflict with the knowledge pack.

## Phase 1 — Forecast KPI card (first approval unit)

Build only one reusable KPI card, not the page.

Required properties:

- Metric label.
- Large metric value.
- Supporting description.
- Evidence/status pill (`Client benchmark`, `External research`, `Planning assumption`, etc.).
- Optional comparison indicator only when a real comparison value exists.
- Optional small data visual only when the underlying series exists.
- Responsive typography and consistent spacing.
- Accessible contrast and semantic text.

Example card content:

**Monthly media investment**  
`AED 12,000`  
`Advertising spend for the selected plan`  
`Planning scenario`

This is copy/layout content for a component example, not a hardcoded default forecast.

Acceptance:

- Card is visually polished and premium.
- The main value has clear hierarchy.
- Labels and status are easy to scan.
- No fake trend pill or fake sparkline.
- It works at desktop and mobile sizes.
- Styling does not leak to other routes.
- Owner explicitly approves before Phase 2 starts.

## Phase 2 — Scenario builder

Implement:

- Budget mode and lead-target mode.
- Dynamic suggestion presets plus custom override.
- Recommended markets preselected by default.
- Multi-select countries and region filters.
- Language coverage selection and proficiency.
- Restore recommended scenario.
- Live input validation.

Acceptance:

- Inputs update the model state.
- Presets populate correctly.
- Custom values work.
- Market multi-select works.
- The client never has to start from an empty strategy.
- Unknown CPLs are handled explicitly.

## Phase 3 — Country portfolio and evidence

Implement:

- Recommended/core/test/watchlist groups.
- Search all 249 country registry rows.
- Country/region allocation shares.
- CPL reference and evidence status.
- Why-this-market explanations.
- Source/date/methodology disclosure.

Acceptance:

- Regional proxy is visibly labelled.
- Unknown data is not displayed as zero.
- Market-demand signals are not presented as transaction shares unless that is what the source measured.
- The recommendation can be restored.

## Phase 4 — Forecast engine and KPI set

Implement:

- Budget-to-leads.
- Lead-target-to-budget.
- Blended CPL.
- CPL bands/ranges.
- Learning versus mature Europe comparison.
- Transparent assumptions.

Acceptance:

- All formulas match `04_FORECAST_MODEL_AND_CALCULATION_RULES.md`.
- Results update when any relevant input changes.
- Unit tests cover point CPL, ranges, missing values and multiple markets.

## Phase 5 — Media allocation

Implement:

- Meta/Google spend split.
- 100% allocation enforcement.
- Europe observed setup information.
- Clear message that channel-level leads cannot be calculated from blended CPL alone.

Acceptance:

- Spend always sums to total media budget.
- No unsupported channel lead volume is shown.

## Phase 6 — Sales-cycle insight

First release:

- Show 78-day median and n=19.
- Explain that this is historical timing only.
- Do not show numeric projected sales.

After client definitions are confirmed:

- Add cohort-based lead-to-sale forecast.
- Show cohort month, lead volume, expected sales by close month and long-tail contribution.
- Label sample size and confidence.

Acceptance:

- Sales volume is disabled while close-rate/denominator definitions are unresolved.
- No same-month spend-to-sales shortcut.

## Phase 7 — Scenario comparison and export

Implement only after core calculations are accepted:

- Recommended versus customized scenario.
- Save plan.
- Export a clear PDF summary with data source and assumption notes.

## Final acceptance checklist

### Product behavior

- [ ] Default plan is preconfigured and explained.
- [ ] Budget and lead-target modes work.
- [ ] Presets and custom override work.
- [ ] Countries are multi-selectable from the worldwide registry.
- [ ] Languages and proficiency affect serviceability recommendations.
- [ ] Meta/Google allocation sums to 100%.
- [ ] Campaign maturity is shown as a comparison, not asked as an input.
- [ ] Scenario comparison uses real calculation outputs.

### Data integrity

- [ ] Every benchmark has an evidence status and provenance.
- [ ] Regional CPL proxies are not labelled country-specific measurements.
- [ ] Missing CPL is never zero.
- [ ] Learning CPL is shown only where supplied.
- [ ] Language percentages use a documented denominator and source.
- [ ] Diaspora-origin figures are not labelled direct speaker counts.
- [ ] Sales projection is disabled until its definitions are confirmed.

### UX quality

- [ ] Premium analytics look, not generic admin template.
- [ ] Both charts and dense tables are used where they add value.
- [ ] All controls are functional.
- [ ] No fake trend indicators or nonfunctional decoration.
- [ ] Desktop and mobile layouts are checked.
- [ ] Keyboard and screen-reader interaction is reasonable.
- [ ] Color is not the only way to communicate status.

### Scope and quality

- [ ] No unrelated route changed.
- [ ] Feature styles are isolated.
- [ ] No credentials are committed.
- [ ] Build/lint/tests pass where applicable.
- [ ] Owner approved each component before the next component was built.
