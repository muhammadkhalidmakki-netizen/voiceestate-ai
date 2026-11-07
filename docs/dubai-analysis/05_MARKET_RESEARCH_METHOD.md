# 05 — Global Market Research Method

## Objective

Build a defensible worldwide country opportunity dataset for Dubai off-plan property lead generation. It should help the product recommend, test, watch or deprioritize markets while making the evidence and uncertainty visible.

The country registry is global. The depth of research is not automatically equal for every country. The first release should focus on countries with meaningful evidence and progressively enrich the remaining list.

## 1. Market recommendation is not a popularity contest

A country should not be recommended simply because it has a large population, high GDP, large diaspora or high social-media usage.

The decision is about the ability to reach, serve and convert people who may be interested and financially capable of buying Dubai off-plan property.

## 2. Evidence categories

Collect separate evidence dimensions rather than collapsing everything into one unexplained score.

### A. Dubai property demand

Preferred evidence order:

1. Dubai Land Department transaction/investor data where source geography and buyer type are explicit.
2. DXBinteract demand/search-intent or property-interest signals, clearly labelled as digital interest rather than completed purchases.
3. Knight Frank, Savills, CBRE, JLL and comparable research on international buyer intentions, HNWI preferences and source markets.
4. Credible broker reports that disclose period, methodology and data definitions.

Record whether a measure represents:

- Completed transactions.
- Investor nationality.
- Non-resident interest/searches.
- HNWI survey intention.
- Website enquiries or leads.
- Broker/client transaction sample.

These are not interchangeable.

### B. Capital and purchasing capacity

Possible inputs:

- HNWI/UHNWI population or wealth distribution.
- Household disposable income and wealth distribution.
- GDP per capita (PPP and nominal, clearly distinguished).
- Cross-border property investment evidence.
- Relevant investor surveys and stated budgets.

Do not treat national GDP per capita as the affordability of an individual lead. A high national average does not prove that the ad audience can afford the selected property price.

### C. International and diaspora population

Use:

- UN DESA International Migrant Stock 2024 origin/destination tables.
- Eurostat country-of-birth and citizenship tables for European destinations.
- OECD international migrant population datasets.
- National census/statistical office sources where available.

Record the field definition: country of birth, citizenship, ancestry, household language or self-reported spoken language. These definitions must not be merged without a note.

### D. Language and sales serviceability

Use the agent-language capability data from `06_LANGUAGE_AND_AGENT_COVERAGE.md`.

A market may have a sizable language community but be unserviceable if no agent can communicate with it. Mark this as a capacity gap, not as zero demand.

### E. Digital reach and advertising practicality

Use current platform planning tools or account estimates for the relevant country and ad language:

- Meta Ads audience estimates from the client's ad account.
- Google Ads Keyword Planner / account campaign history.
- Google Trends as a directional interest indicator, not lead volume.
- DataReportal and national digital statistics for broad digital adoption.
- Platform-specific geographic/language availability and policy requirements.

Digital population or social-media usage is not a Dubai-property demand metric.

### F. Acquisition economics

Preferred data:

1. Client campaign and CRM performance by country, campaign type, language and channel.
2. Client historical CPL with sample size, spend, date range and lead definition.
3. Controlled country tests with comparable campaigns and landing pages.
4. External directional cost estimates only when sourced and dated.

Do not infer CPL directly from demand share, GDP, HNWI population, diaspora size, CPM averages or search volume.

### G. Competitive pressure

Potential evidence:

- Google Ads Keyword Planner competition index for relevant local keywords.
- Auction Insights where the client's campaign has enough eligible data.
- Search-result density for commercial property queries.
- Meta Ad Library review of active real-estate advertisers and creatives.
- Client cost and impression-share trends.

Meta Ad Library advertiser counts are not auction competition or CPM data. Keyword competition is not proof of social-ad competition. State the scope of every competition indicator.

## 3. Market scoring framework

Use a transparent multi-signal score as a decision aid, not as a probability of conversion. An initial administrator-configurable weight model may be:

| Dimension | Suggested weight | What it means |
|---|---:|---|
| Dubai demand evidence | 30% | Strength and recency of Dubai property demand signals. |
| Capital capacity | 20% | Evidence of relevant wealth/purchasing capacity. |
| Language/diaspora opportunity | 15% | Reachable language community and relevant diaspora presence. |
| Digital reach | 10% | Practical online reach for the campaign's geography/language. |
| Acquisition economics | 15% | Client CPL, lead quality and controlled-test evidence. |
| Operational serviceability | 10% | Agent language, time zone, follow-up coverage and sales capacity. |

These weights are a starting framework, not an externally validated model. Keep them editable and record the model version.

### Scoring safeguards

- Store raw evidence separately from the normalized score.
- Store source, publication/observation date, geography, definition and confidence.
- Do not assign a high score based on a single weak source.
- Do not fill missing dimensions with zero and then call the result a low-potential market.
- If too many dimensions are missing, show `Insufficient evidence` rather than a numerical rank.
- Consider a minimum evidence-coverage threshold before exposing a composite score.
- Show confidence separately from the score.
- A score is a prioritization aid; it is not a prediction of leads, buyers, sales or ROI.

## 4. Recommended market classes

Use four operational labels:

- `Core` — repeated or high-quality Dubai demand evidence, usable acquisition benchmark or validated campaign data, and serviceable agent coverage.
- `Test` — credible demand or demographic rationale exists, but the CPL/lead-quality economics need a controlled campaign test.
- `Watchlist` — plausible demand but insufficient current evidence or incomplete sales/service coverage.
- `Not recommended / blocked` — explicit policy, legal, operational, platform or client constraint; explain the reason.

`Research pending` is a data-quality status, not a market-opportunity class.

## 5. Initial researched market signals

A 2026 DXBinteract-derived ranking of international digital interest (June–August 2026) was reported as:

1. India — 16.3%
2. United States — 13.0%
3. United Kingdom — 10.7%
4. Pakistan — 5.4%
5. Saudi Arabia — 4.4%
6. Egypt — 3.7%
7. Canada — 3.5%
8. Australia — 3.0%
9. France — 2.9%
10. Singapore — 2.5%
11. Germany — 1.9%
12. Netherlands — 1.9%
13. Türkiye — 1.9%
14. Jordan — 1.6%
15. South Africa — 1.5%

Source chain: DXBinteract data as described by secondary reports from Palmstone Properties and V Capital Research (September 2026). Treat these figures as the reported share of international digital interest/searches, excluding UAE-based demand—not completed purchases, investor nationality, ad-platform reach, lead share or conversion rate. Independently validate with DXBinteract/DLD before using them as a high-confidence rank.

This data is suitable for a `demand signal` with a medium/low confidence label, not for a CPL formula.

Knight Frank's 2025 Destination Dubai study surveyed 387 HNWIs across India, the UK, Saudi Arabia and East Asia (China, Hong Kong and Singapore). Its published findings show meaningful stated interest in Dubai property, including strong intent among the Saudi and Indian respondent samples. These are HNWI survey findings, not the preferences of all residents of those countries and not a media performance estimate.

## 6. Country research workflow

For each country:

1. Confirm the country/territory code and market geography.
2. Search for current Dubai-specific transaction, investor or buyer-interest evidence.
3. Find country-level wealth/affordability evidence relevant to the target property band.
4. Find diaspora and migration evidence relevant to the agent languages.
5. Record official/commonly spoken languages and the data definition.
6. Check digital reach and platform campaign practicality.
7. Check current competitive indicators separately for Google and Meta.
8. Search client CRM/ad-account history for CPL, working-lead rate and sales outcomes.
9. Assign `Core`, `Test`, `Watchlist` or `Not recommended` only when the evidence threshold is met.
10. Record sources and date for every numeric field.

## 7. CPL estimation policy

Never invent a country CPL just to fill a worldwide matrix.

Use this hierarchy:

- `Measured client CPL` — actual client campaign results, with period and sample size.
- `Client regional proxy` — client-supplied regional CPL inherited by an assigned country, shown explicitly as a proxy.
- `External directional range` — external source estimate, dated and low confidence; not treated as a client benchmark.
- `Planning assumption` — editable scenario input, visually distinct from measured data.
- `Not available` — no defensible value.

If a country has a demand score but no CPL data, show its market opportunity and `CPL validation required`. Do not calculate a precise budget-to-lead forecast for that country unless the user supplies an editable planning CPL assumption.

When enough client data exists, calculate country CPL using comparable campaign periods, spend, lead definitions, targeting language and conversion attribution. Use sample-size and variance controls so a one-lead test does not become a market benchmark.

## 8. Data freshness

- Every numeric market signal must have `observed_at` or `published_at`.
- Demand/competition signals should be refreshed at least quarterly when data is available.
- Language/diaspora data may refresh less frequently, but show the source year.
- Client performance benchmarks should use a rolling period selected by the administrator and keep the original observation window.
- Expired data should visibly downgrade confidence rather than silently remain current.

## 9. Initial recommendation behavior

On first load:

- Use available country demand signals plus client benchmark coverage.
- Prioritize countries with both a meaningful Dubai-demand signal and a usable client benchmark.
- Include relevant high-signal markets needing a test as test candidates, with no fabricated CPL.
- Apply agent-language coverage if supplied; if it is not yet configured, show `Language coverage not configured` rather than pretending every language is serviceable.
- Keep a recommended selection that can be restored after custom edits.

## 10. Research status values

Suggested values:

- `verified_client`
- `external_research`
- `directional_external`
- `regional_proxy`
- `planning_assumption`
- `research_pending`
- `stale`
- `not_applicable`
