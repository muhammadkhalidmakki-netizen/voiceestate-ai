# 04 — Forecast Model and Calculation Rules

## Purpose

This file defines the only acceptable interpretation of the current planning inputs. The implementation should place these calculations in a testable model layer, not inside UI components.

## 1. Units and conventions

- Currency: AED.
- Default planning month: 30 days.
- Monthly media investment means ad spend only.
- Exclude agency fees, creative production, landing-page costs, CRM fees, VAT and other taxes unless a future setting explicitly includes them.
- Lead means a raw enquiry/submission unless a metric is explicitly named `qualified lead` or `working lead`.
- Use decimals internally; format rounded currency and lead counts in the UI.
- Do not round intermediate values in a way that changes totals.
- Support CPL values and ranges.

## 2. Verified regional benchmark inputs

| Region | Countries/coverage | Mature/reference CPL | Learning CPL | Notes |
|---|---|---:|---:|---|
| Europe | Switzerland, Germany, France, Luxembourg, Netherlands, Norway | AED 50 | AED 120 | Both values supplied. Observed setup around AED 200/day/platform. |
| South Asia & Africa | India, Pakistan, Africa broad | AED 30 or less | Not supplied | Do not assign an Africa-wide value to every African country unless client confirms it applies. |
| North America | USA, Canada | AED 70 | Not supplied | No learning premium supplied. |
| Oceania | Australia, New Zealand | AED 70 | Not supplied | No learning premium supplied. |
| UAE | UAE | AED 80–100 | Not supplied | Varies by campaign. |

The word `mature` in the original client table labels the first CPL column. Preserve the original scope in the data record; do not invent maturity values where the source did not supply them.

## 3. Planning modes

### Mode A — Plan by monthly budget

Inputs:

- Monthly media budget `B`.
- Selected countries/regions `i`.
- Budget allocation share per selected country/market `s_i` (sum = 1).
- Available CPL reference per market `CPL_i` (may be a point or a range).
- Optional maturity scenario: learning or mature comparison, not a user-selected campaign state.

For a point CPL:

`Spend_i = B × s_i`

`EstimatedLeads_i = Spend_i ÷ CPL_i`

`TotalEstimatedLeads = Σ EstimatedLeads_i`

`BlendedCPL = B ÷ TotalEstimatedLeads`

For a CPL range `[low, high]`:

`Leads_low = Spend_i ÷ high`

`Leads_high = Spend_i ÷ low`

The order matters: a higher CPL produces fewer leads. Label the result as a range.

### Mode B — Plan by monthly lead target

Inputs:

- Monthly raw-lead target `T`.
- Selected countries/regions.
- Budget share `s_i` per market.
- CPL point or range.

For point CPLs, use an allocation-weighted CPL only when allocation shares are defined:

`RequiredSpend = Σ (TargetLeads_i × CPL_i)`

where:

`TargetLeads_i = T × s_i`

For CPL ranges, return a budget range:

`RequiredSpend_low = Σ (TargetLeads_i × CPL_low_i)`

`RequiredSpend_high = Σ (TargetLeads_i × CPL_high_i)`

If a market only has `AED 30 or less`, treat AED 30 as the conservative supplied reference ceiling for an upper planning calculation, but label it `client-reported: AED 30 or less`. Do not invent a lower bound.

If any selected market lacks a usable CPL benchmark, do not silently drop it from the calculation. Show that market as `CPL research pending`, keep its budget share visible, and either:

- exclude it from the calculated lead estimate with an explicit coverage note; or
- require an editable, explicitly labelled planning CPL assumption before producing a combined estimate.

Do not turn an unknown CPL into zero.

## 4. Country allocation and regional benchmarks

A selected country may inherit a regional CPL **proxy** only when the source mapping explicitly assigns it to a client benchmark region. The UI must say `Regional benchmark used as a country proxy`.

The result is not a measured country-specific CPL. Never label it `Germany CPL` or `France CPL` if the value is actually the shared Europe benchmark.

The country-level research model may add demand, affordability, diaspora and digital signals. Those signals can affect market priority, recommendation order or confidence. They must not be used as arbitrary numerical CPL multipliers.

A future country-specific CPL estimate must be based on one or more of:

1. Client's own campaign results with meaningful sample size and date range.
2. Client CRM lead cost data linked to country and source.
3. Google Ads Keyword Planner / account campaign data for the actual relevant campaign and geography.
4. Meta Ads account campaign data and documented test results.
5. A clearly cited external estimate, stored as a broad range and labelled directional.

## 5. Suggested budget and lead presets

Presets should be dynamic, calculated from the current recommended market portfolio and its valid CPL inputs.

Recommended labels:

- `Entry test`
- `Recommended`
- `Expansion`
- `Custom`

Suggested lead targets may use administrator-configurable planning levels (for example 50, 100 and 200 raw leads/month) but must be editable. They are not performance promises.

For each lead preset:

`SuggestedBudget = TargetLeads × CurrentBlendedCPL`

For each budget preset:

`SuggestedLeadVolume = Budget ÷ CurrentBlendedCPL`

Use a CPL range to display a budget range or lead range.

Do not use the word `minimum` unless a genuine operational floor is backed by a source. In the current data, the only operating pattern is Europe: approximately AED 200/day on Meta and AED 200/day on Google. It is an observed pattern, not a universal platform minimum.

A label such as `Suggested starting investment` is safer than `Minimum budget` for unvalidated markets.

## 6. New/learning versus mature comparison

The client must not choose a campaign maturity state. The dashboard should show a side-by-side or toggle comparison automatically where data exists.

Europe:

- Learning CPL = AED 120.
- Mature CPL = AED 50.
- CPL reduction from learning to mature = `(120 - 50) / 120 = 58.33%`.

For the same target `T`:

`LearningBudget = T × 120`

`MatureBudget = T × 50`

For the same budget `B`:

`LearningLeads = B ÷ 120`

`MatureLeads = B ÷ 50`

Do not predict when a campaign becomes mature. The data only supplies a CPL comparison, not a maturity-duration curve.

For all other regions, render `Learning-phase benchmark not yet supplied`. Do not copy Europe's multiplier, infer zero difference or extrapolate the 120/50 ratio.

## 7. Meta and Google allocation

Inputs:

- Meta share `m`, from 0 to 1.
- Google share `g = 1 - m`.

`MetaSpend = TotalBudget × m`

`GoogleSpend = TotalBudget × g`

The split control must enforce `m + g = 100%`.

Current client data provides regional blended CPLs, not platform-specific CPLs. Therefore:

- Show Meta and Google budget amounts.
- Do not calculate platform-specific lead counts from the blended regional CPL.
- Do not imply 50/50 is optimal outside the observed Europe operating pattern.
- A 50/50 default outside Europe is a neutral starting assumption only.

The client supplied Meta working-lead rate of 15%+ and Google rate of 20%+. The meaning is unresolved. Do not use these rates in calculations until the client confirms whether they mean raw-lead-to-working-lead or raw-lead-to-sale.

If the client later confirms they are raw-to-working-lead rates, and channel-level raw leads are known:

`WorkingLeads_Meta = RawLeads_Meta × MetaWorkingRate`

`WorkingLeads_Google = RawLeads_Google × GoogleWorkingRate`

If channel CPLs are not known, channel raw leads remain unknown and these working-lead counts cannot be responsibly calculated from spend alone.

## 8. Working leads and sales conversion

Do not conflate these stages:

`Ad spend → Raw enquiries → Working/qualified leads → Sales`

A raw-to-working rate is not a sales close rate.

If the client's 15% / 20% figures are raw-to-working rates, a separate working-lead-to-sale rate is required.

If they are raw-to-sale rates, they may be used as close rates only after confirmation of definitions, denominator, source, period and channel attribution.

Until clarified, no numeric sales-volume forecast should be displayed.

## 9. Sales-cycle timing data — current permitted usage

Client-supplied historical observations (19 anonymized records):

| Checkpoint | Supplied share | Count |
|---|---:|---:|
| 30 days | 21% | 4 of 19 |
| 60 days | 42% | 8 of 19 |
| 90 days | 53% | 10 of 19 |
| 120 days | 74% | 14 of 19 |
| 270 days | 89% | 17 of 19 |
| Long tail, 9–26 months | 11% | 2 of 19 |
| Median | 78 days | — |

### Unresolved interpretation

The sample's denominator and meaning are not yet confirmed. It is not clear whether:

- the percentages are a distribution of elapsed time among deals that eventually closed; or
- they are cumulative lead-to-sale conversion rates among all original leads.

The fact that 17/19 are listed by 270 days and the remaining 2/19 are in the long tail can be consistent with a time-to-close distribution among a set of closed deals. It does **not** establish that 89% of all raw leads become sales.

### What can be shown now

Show a compact historical sales-cycle insight:

- Median observed time to sale: 78 days.
- Sample size: 19 records.
- Reported long-tail cases: 9–26 months.
- Clear note: `Historical timing observation. This does not estimate the number or probability of sales from your planned leads.`

Do not use the 21/42/53/74/89% figures as monthly lead conversion rates in the primary forecast until the denominator and definition are confirmed.

### Future cohort forecast after validation

If the timeline is confirmed as the cumulative distribution of time-to-close among successful sales, and an overall raw-lead-to-sale close rate `p` is validated, then a cohort forecast can be calculated.

Let:

- `L_m` = raw leads generated by the cohort in month `m`.
- `p` = eventual raw-lead-to-sale probability.
- `C(t)` = cumulative share of successful sales closed by elapsed time `t`.
- `C(t_k) - C(t_(k-1))` = share of eventual sales from the cohort expected in the `k`th time interval.

Then:

`ExpectedSalesFromCohortInInterval_k = L_m × p × (C(t_k) - C(t_(k-1)))`

This is a cohort allocation, not a same-month spend-to-sales formula. The long-tail share must remain visible.

If the supplied percentages are instead confirmed as cumulative conversion of all raw leads, use the validated cumulative raw-lead-to-sale curve directly, but verify the denominator and eventual conversion interpretation first.

The 19-record sample is small. Label any resulting forecast `historical-sample-based` and show a low-confidence warning until more observations are available.

## 10. Scenario comparison

Store a complete scenario snapshot containing:

- Mode (budget or lead target).
- Input amount.
- Month length.
- Selected countries and their spend shares.
- Regional/country CPL references used.
- Language selections and proficiency.
- Meta/Google allocation.
- Maturity comparison values.
- Research dataset version/date.
- Assumptions and missing data.

Compare actual scenario outputs, not hardcoded card values. A comparison must preserve the original recommended scenario while the client edits the customized scenario.

## 11. Rounding and display

- Currency: whole AED by default; optionally show one decimal in calculation detail.
- Leads: one decimal in technical detail; whole-number headline with a clear `approximately` label.
- CPL: preserve ranges such as `AED 80–100` and inequality such as `AED 30 or less`.
- Percentages: one decimal where useful.
- Never show false precision from weak evidence. A sourced estimate range is preferable to a fabricated decimal.

## 12. Required calculation tests

At minimum, test:

- Budget-to-leads for every benchmark.
- Leads-to-budget for every benchmark.
- Multi-country allocation with different CPLs.
- CPL ranges with correct lower/upper lead bounds.
- Missing country CPL behavior.
- 100% Meta / 0% Google, 0% Meta / 100% Google and split totals.
- Europe learning versus mature comparison.
- Non-Europe missing learning benchmark.
- 30-day monthly normalization.
- Rounding and zero/negative/empty input validation.
- Sales forecast disabled while definitions are unresolved.
