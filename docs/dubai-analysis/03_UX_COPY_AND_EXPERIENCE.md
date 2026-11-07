# 03 — UX, Interaction and Client-Facing Copy

## Experience principle

**Recommend first. Explain clearly. Let the client take control.**

The client should open a useful, pre-configured plan—not a blank form. The recommended setup must be editable, and the original recommendation should remain available for comparison.

## Recommended page hierarchy

The full experience can eventually contain these areas, but build them in the approved sequence rather than all at once:

1. Header and scenario identity.
2. Recommended plan / scenario builder.
3. Forecast KPI cards.
4. Market portfolio and country allocation.
5. Language coverage and diaspora opportunities.
6. Meta/Google investment allocation.
7. Learning versus mature campaign comparison.
8. Lead pipeline and sales-cycle outlook.
9. Assumption and source transparency.
10. Scenario comparison and save/export actions.

## Header copy

**Market Planning for Prophunters**

Supporting line:

`Explore the markets, investment levels and lead volumes that could shape your Dubai off-plan buyer pipeline.`

Optional scenario indicator:

`Recommended starting plan` / `Your customized plan`

Do not call the dashboard a guaranteed forecast or promise buyer numbers.

## Section 1 — Build your plan

Heading:

**Start with the outcome you want to plan for.**

Description:

`Choose a monthly media budget or a lead target. We'll use the markets and benchmarks available to build the corresponding plan.`

Two modes:

### Plan by monthly budget

Input label: `Monthly media budget`

Helper: `How much would you like to invest in advertising each month?`

Display currency: AED.

Show three dynamic suggestions calculated from the currently selected/recommended portfolio:

- `Entry test` — lower-commitment test scenario.
- `Recommended` — the suggested planning level based on the selected lead objective and available evidence.
- `Expansion` — a higher-volume scenario.

The amounts must be calculated from valid benchmark data and display the assumptions behind them. They are planning suggestions, not guaranteed minimums.

Custom control label: `Enter a different budget`

### Plan by lead target

Input label: `Monthly lead target`

Helper: `How many new enquiries would you like your marketing to generate each month?`

Show the same three dynamic choices:

- `Entry test` — smaller learning volume.
- `Recommended` — a practical target for the current plan.
- `Expansion` — higher-volume target.

Custom control label: `Set a custom lead target`

The term `lead` means a raw submitted enquiry unless the UI explicitly says `qualified lead` or `working lead`. Do not use the term `buyer` for every raw enquiry.

### Suggested values and budget floor rules

- Suggestions are derived from the selected market portfolio's CPL benchmark/range.
- Suggested lead-volume presets are planning scenarios, not promises.
- If a verified platform/daily operating floor exists for a market, show it with its source and applicability.
- The only currently supplied operating pattern is Europe at approximately AED 200/day per platform (about AED 6,000/month on Meta and AED 6,000/month on Google using a 30-day month). This is an observed setup, not a universal minimum.
- For markets without a verified operating floor, use wording such as `Suggested planning entry point`, never `minimum required to run ads`.

## Section 2 — Recommended markets

Heading:

**Your recommended buyer markets**

Description:

`We've pre-selected markets with relevant Dubai property-demand signals and available acquisition benchmarks. Adjust the mix to match your audience, language coverage and investment priorities.`

Default view:

- A recommended set is already selected.
- Group countries into `Core markets`, `Test markets` and `Watchlist`.
- Explain why each market is included, using a short evidence-based reason.
- Show a confidence/evidence label.
- Show a regional CPL reference only where available.

Controls:

- Search all countries.
- Filter by region.
- Multi-select countries.
- Add all / remove all within a region.
- Restore recommended plan.
- Show selected markets only.

Suggested labels:

- `Core opportunity`
- `Worth testing`
- `Monitor`
- `Research pending`
- `Regional benchmark`
- `Country-level data available`

Do not show a hard `Low competition` badge unless there is current, comparable competition data. Competition must not be inferred from the absence of search results.

### Recommended portfolio logic

Build the initial selection from the evidence available in `data/country-market-master.csv` and the research rules in `05_MARKET_RESEARCH_METHOD.md`. The shortlist must be data-driven and configurable by the administrator. Do not permanently hardcode a hand-picked country list into UI components.

The initial evidence-backed seed markets include India, United States, United Kingdom, Pakistan, Saudi Arabia, Egypt, Canada, Australia, France and Singapore, with secondary signals for Germany, Netherlands, Türkiye, Jordan and South Africa. This is an initial research seed list—not a claim that all these markets have equal economics or are all ready for immediate activation.

Client benchmark coverage also exists for Switzerland, Germany, France, Luxembourg, Netherlands, Norway, India, Pakistan, United States, Canada, Australia, New Zealand and UAE. See the benchmark file for exact scope and caveats.

## Section 3 — Language coverage

Heading:

**Reach buyers in the languages your team can support.**

Description:

`Choose the languages your sales team can handle confidently. We'll highlight markets where those languages are widely used, including relevant diaspora communities outside their countries of origin.`

Ask for agent languages, not the client's personal languages.

For each language, allow a proficiency selection:

- `Fluent / native-level`
- `Professional`
- `Conversational`

Only `Fluent / native-level` and `Professional` should count as full service coverage in the default recommendation. Conversational coverage can be displayed as limited support. Make this rule administrator-configurable.

A selected language should reveal:

- Primary markets where it is official, dominant or widely used.
- Secondary diaspora markets where credible migrant-origin data indicates a meaningful community.
- Estimated language audience only when a defensible speaker count/share exists.
- Whether the market is serviceable by the selected agent languages.
- The evidence and date behind each audience estimate.

Example microcopy for Arabic:

`Arabic support can open opportunities in core Arabic-speaking markets and in diaspora communities across Europe, North America and other international hubs. Diaspora estimates are shown separately from resident-country language statistics.`

Do not imply that every person born in an Arab country speaks Arabic, or that every Arabic speaker is an investor.

## Section 4 — Forecast snapshot

Heading:

**Your plan at a glance**

Description:

`A live view of the monthly investment and lead volume implied by your current market plan.`

Core metrics:

1. `Monthly media investment`
2. `Lead target` or `Estimated leads` depending on mode
3. `Estimated CPL benchmark`
4. `Sales-cycle indicator` — use only a timing statistic until close-rate data is validated

Avoid `buyer leads` unless the lead definition has been explicitly qualified.

Metric helper text examples:

- Monthly media investment: `Advertising spend only; excludes agency fees, production and taxes.`
- Lead target: `Your chosen monthly enquiry objective.`
- Estimated leads: `Modelled from the selected budget and available CPL benchmark.`
- Estimated CPL benchmark: `A planning reference, not a guaranteed campaign result.`
- Sales-cycle indicator: `Historical timing observation; not a close-rate forecast.`

The lead KPI must distinguish a user-entered target from a model-derived estimate. Do not display a user-entered value as if it were an independently forecast result.

## Section 5 — Learning versus mature campaigns

Do not ask the client to select campaign maturity.

Heading:

**What campaign maturity can change**

Description:

`New campaigns can require a higher acquisition cost while the platform and team learn. Where we have both benchmarks, compare the learning-phase plan with the mature-campaign reference.`

For Europe, show:

- `New / learning benchmark: AED 120 CPL`
- `Mature benchmark: AED 50 CPL`
- `Illustrative benchmark reduction: 58.3%`

The 58.3% is the arithmetic reduction from AED 120 to AED 50, not a guaranteed performance improvement or a time-to-maturity prediction.

For other regions, display `Learning-phase benchmark not yet supplied` rather than copying Europe's premium or setting it to zero.

The comparison should calculate:

- Investment required for the same lead target in each maturity state.
- Estimated leads supported by the same budget in each state.
- CPL difference, only where both values exist.

## Section 6 — Media allocation

Heading:

**How should your media investment be distributed?**

Description:

`Adjust the share of your monthly budget assigned to Meta and Google. The allocation changes the spend plan; platform-level lead estimates require channel-specific CPL data.`

Use:

- One accessible split control (slider or draggable split bar).
- Meta percentage and AED amount.
- Google percentage and AED amount.
- A visual allocation bar.
- A clear 100% total.

Do not imply that an equal split is optimal. Europe has an observed AED 200/day per platform pattern; other regions have no client-supplied optimal split. An initial 50/50 setting elsewhere is only a neutral planning default.

If the blended regional CPL is the only available source, calculate total portfolio leads from the blended benchmark. Do not split those leads between Meta and Google as though channel CPLs were known.

## Section 7 — Sales-cycle outlook

Do not title this section `Observed Conversion Timing` in the client interface; it is too technical and unclear.

Use:

**When your pipeline may mature**

Description:

`Property enquiries rarely turn into completed sales on the day they arrive. Historical observations show that the sales journey can extend across several months. This view helps set expectations for the time between lead generation and a potential close.`

For the current data, show a compact timing insight:

- `78 days` — observed median time to sale.
- `19 records` — historical sample size.
- `Up to 26 months` — reported long-tail observation.

Do not turn the milestone percentages into a forecast of sales per 100 leads until the sample denominator and meaning are confirmed.

Once validated, use a cohort timeline showing each monthly lead cohort and the expected sales distribution over later months. A cohort view is much more useful than saying `this month's spend = this month's sales`.

## Section 8 — Explain the numbers

Add an accessible disclosure called:

`How this estimate is calculated`

It must explain the selected CPL, budget allocation, lead calculation, benchmark status, assumptions and anything missing. Use plain language and show the arithmetic where possible.

## Trust and confidence labels

Use three consistent statuses:

- `Client benchmark` — supplied by the client or directly calculated from client data.
- `External research` — market evidence from a named source and dated observation.
- `Planning assumption` — editable modelling assumption that is not client-verified.

For missing data use `Not yet validated` or `Research pending`. Never imply that missing information equals zero.

## Tone

Confident, clear, strategic and candid. Avoid hype, overpromising, sales pressure and marketing jargon.
