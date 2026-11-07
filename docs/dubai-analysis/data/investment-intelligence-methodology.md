# Country investment intelligence

Generator: `scripts/market-intel/investment_intel.py`. Outputs: `country-investment-conditions.csv`, `dubai-survey-evidence.csv`, `country-buyer-motivations.csv`, plus `country-market-signals.csv`.

## Indicators and dates

Each indicator carries its own year. Indicators dated before 2024 are not shown as current conditions (growth, inflation, political stability, currency move); slow-moving ones (Gini, credit depth, outbound FDI) must be 2022 or later.

| Indicator | Source | Countries with a current value |
|---|---|---:|
| GDP growth | World Bank WDI | 199 |
| Inflation (CPI) | World Bank WDI | 175 |
| Political stability | World Bank WGI | 206 |
| Currency move vs USD (official rate) | World Bank WDI | 197 |
| Outbound FDI % GDP | World Bank WDI | 176 |
| Private credit % GDP | World Bank WDI | 161 |
| Modelled affluent population | World Bank (consumption, Gini) | 158 |

Gaps stay blank, not zero.

## Modelled, not measured

- **Affluent population**: people with annual consumption above international $60,000 PPP, from a lognormal fit to mean household consumption and the Gini index (25 countries use their income-group median Gini as a labelled fallback). It is a proxy, not a wealth or HNWI count.
- **Investment capability index** and **conditions index**: arithmetic combinations of the indicators above, halved where sanctions are possible.
- **Sanctions and capital-control flags** (Russia, Iran, North Korea, Cuba, Syria, Belarus; China capital controls) come from general knowledge and are marked `general_knowledge_unverified`. IMF AREAER (capital-account restrictions) was not accessed.

## Dubai evidence kept separate

| Kind | What exists |
|---|---|
| Transactions by buyer nationality | None obtained (research gap) |
| Search interest | 15 countries, DXBinteract via secondary reports; interest, not purchases |
| Survey intention | Knight Frank / YouGov 2025 (387 HNWIs): Saudi 66% planned a UAE purchase in 2025; East Asia 17%; 74% of British respondents considering the UAE named Dubai the preferred emirate; 33% of all respondents intend to invest this year. Secondary summaries; intentions only |
| General market potential | Modelled indices only |

## Buyer motivations

Six categories were requested (rental income/ROI, capital appreciation, diversification and asset protection, lifestyle and relocation, holiday or second home, business and residency). Evidence reviewed supports only **market-wide** statements:

- lifestyle (green space, 2024 survey edition), capital-appreciation expectations (36% of HNWIs for branded residences, 2024), portfolio expansion (inaugural edition, dated), and end user vs investor split (Betterhomes 2025: 43% / 57%).

**No country-specific motivation is documented.** Motivations are not assigned to nationalities, so the motivations factor (15% of the score) is missing for every country and lowers evidence confidence rather than scoring zero. The per-nationality 2025 breakdown would need the full Knight Frank report, DLD buyer data or a primary buyer survey.

## What was not obtained

HNWI population, wealth distribution beyond Gini, international property activity per country, growth in Dubai interest over time, competitor presence, capital-movement and payment-access rules, and country-specific motivations. See `research-limitations.md`.
