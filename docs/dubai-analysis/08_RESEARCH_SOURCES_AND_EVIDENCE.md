# 08 — Research Sources and Evidence Register

**Research checked:** 6 November 2026.  
This register is a starting point, not a complete live data feed. Recheck source availability, publication dates and methodology before future production updates.

## A. Client-supplied facts

These are treated as the current client-provided reference inputs, not independently audited third-party statistics.

### Regional CPL benchmarks

| Region | Coverage | Mature/reference CPL | Learning CPL |
|---|---|---:|---:|
| Europe | Switzerland, Germany, France, Luxembourg, Netherlands, Norway | AED 50 | AED 120 |
| South Asia & Africa | India, Pakistan, Africa broad | AED 30 or less | Not supplied |
| North America | USA, Canada | AED 70 | Not supplied |
| Oceania | Australia, New Zealand | AED 70 | Not supplied |
| UAE | UAE | AED 80–100, varies by campaign | Not supplied |

Europe operating pattern: approximately AED 200/day/platform, or about AED 6,000/month on Meta and AED 6,000/month on Google using a 30-day month. This is an observed operating pattern, not a universal minimum or guaranteed optimal split.

### Working-lead rates

- Meta: 15% or above.
- Google: 20% or above.
- Client notes that results vary by region.
- Meaning is unresolved: raw enquiry to workable lead, or raw enquiry to sale.
- Do not use in sales forecasts until definition is confirmed.

### Historical timing sample

19 anonymized records; median 78 days; checkpoints: 4/19 at 30 days, 8/19 at 60 days, 10/19 at 90 days, 14/19 at 120 days, 17/19 at 270 days and 2/19 in a reported 9–26 month long tail.

The denominator/interpretation is unresolved. Do not treat these as raw-lead-to-sale probabilities until confirmed.

## B. External Dubai-demand evidence

### 1. DXBinteract-derived international property-interest ranking, June–August 2026

Secondary reports published in September 2026 cite DXBinteract data on international interest in Dubai residential property searches, excluding UAE-based demand:

| Country | Reported share of international interest |
|---|---:|
| India | 16.3% |
| United States | 13.0% |
| United Kingdom | 10.7% |
| Pakistan | 5.4% |
| Saudi Arabia | 4.4% |
| Egypt | 3.7% |
| Canada | 3.5% |
| Australia | 3.0% |
| France | 2.9% |
| Singapore | 2.5% |
| Germany | 1.9% |
| Netherlands | 1.9% |
| Türkiye | 1.9% |
| Jordan | 1.6% |
| South Africa | 1.5% |

Sources:

- Palmstone Properties, 29 September 2026: https://www.palmstone.ae/en/insights/articles/buyer-nationalities-dubai-2026
- V Capital Research, 23 September 2026: https://vcapital.ae/research/top-10-nationalities-buying-dubai-property-2026

**Critical limitation:** These secondary articles describe a DXBinteract measure of digital interest/searches. It is not a count of transactions, a count of completed investors, nationality of actual purchasers, ad-platform audience reach, leads, conversion rates or CPL. Treat as a directional demand signal and verify against DXBinteract/DLD before giving it high confidence.

### 2. Knight Frank — Destination Dubai 2025

Knight Frank's 2025 research surveyed 387 high-net-worth individuals across India, the UK, Saudi Arabia and East Asia (China, Hong Kong and Singapore). The report presents Dubai property purchase appetite and buyer intentions within that HNWI sample.

Sources:

- Report landing page: https://www.knightfrank.ae/research/reports/destination-series/destination-dubai
- Data/explanation page: https://www.knightfrank.ae/research/reports/destination-series/destination-dubai/discover-the-data
- Key-insights PDF: https://www.knightfrank.ae/site-assets/research/destination-dubai/destination-dubai-2025---key-insights.pdf

Published findings include high levels of stated intent among Saudi and Indian HNWI respondents. These are survey responses from selected wealth segments, not all residents in those countries and not guaranteed purchase behavior.

### 3. Dubai market reports and official-data context

- Dubai Land Department portal: https://dubailand.gov.ae/
- Dubai Pulse open data: https://www.dubaipulse.gov.ae/
- Dubai REST: https://dubailand.gov.ae/en/eservices/dubai-rest/

Use official DLD/Dubai Pulse data wherever the relevant dataset provides a country, buyer-residency or transaction definition. Do not claim a nationality breakdown exists in a public official dataset without checking the actual dataset and metadata.

A 2024 DLD-derived analysis published by FHI Global reports substantial non-resident participation and strong off-plan growth. Treat the publisher's analysis as secondary interpretation unless the underlying DLD dataset is independently checked:

- https://fhiglobal.ae/dubai-real-estate-report-2024

## C. Migration and diaspora data

### 4. UN DESA — International Migrant Stock 2024

UN DESA's 2024 dataset covers migrant stock by origin and destination for 233 countries and areas, including country-of-origin and destination relationships. It is appropriate for identifying diaspora-origin population proxies and international migration patterns.

Source:

- https://www.un.org/development/desa/pd/content/international-migrant-stock
- 2024 key facts PDF: https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2025_intlmigstock_2024_key_facts_and_figures_advance-unedited.pdf

**Limitation:** A migrant's country of birth/citizenship does not prove their current language. Use it as a diaspora-origin proxy, not an exact speaker count.

### 5. Eurostat migration and population tables

Useful tables include population by citizenship and country of birth, updated in September 2026 and covering annual country records through 2025.

Sources:

- https://ec.europa.eu/eurostat/databrowser/view/migr_pop5ctz/default/table
- https://ec.europa.eu/eurostat/databrowser/view/migr_pop6ctb/default/table

Use country-of-birth/citizenship definitions exactly as published. Do not relabel the numbers as ethnicity or language speakers.

### 6. OECD migration data

OECD provides foreign-born/foreign population and migration stocks/flows for OECD destinations.

Source:

- https://www.oecd.org/en/data/datasets/overview-data-on-migration-flows-and-migrant-populations.html

**Limitation:** Coverage and reference periods differ by table. Use the dataset metadata and note the year/definition.

## D. Additional research inputs to acquire

The following are recommended research sources for future country enrichment. No unsupported values are populated in the starter CSV.

| Dimension | Preferred source(s) | Usage |
|---|---|---|
| Wealth / HNWI | Knight Frank Wealth Report; UBS Global Wealth Report; national wealth statistics | Capital-capacity signal, not individual lead qualification. |
| GDP / income | World Bank World Development Indicators; IMF datasets; national statistics | Context only; not a direct buyer-affordability score. |
| Digital adoption | DataReportal; ITU; national telecom statistics | Digital-reach context. |
| Search demand | Google Trends; Google Ads Keyword Planner | Relative interest and keyword planning; not lead forecast. |
| Meta audience | Meta Ads Manager account estimates | Platform addressable audience, stored separately from population. |
| Competition | Google Keyword Planner, Auction Insights, Meta Ad Library | Channel-specific competitive context; scope must be stated. |
| Travel connectivity | Official airport/airline route data | Operational/convenience context only. |
| Language | National censuses/statistical offices; Eurostat; UN/OECD migration datasets | Language shares or diaspora proxies with definitions. |
| Campaign CPL | Client ad accounts and CRM | Preferred source for acquisition economics. |

## E. Research quality rules

- Capture exact source URL and publication/observation date.
- Capture metric definition, denominator, geography and period.
- Prefer primary and official data for factual statistics.
- Secondary sources can be used to discover a signal but should be marked as secondary.
- Do not combine incomparable datasets into a single precise score without a documented normalization model.
- A source being recent does not automatically make its methodology strong.
- Refresh market-demand indicators at least quarterly when available.
- Treat client-supplied data as `client supplied`, not third-party verified.
