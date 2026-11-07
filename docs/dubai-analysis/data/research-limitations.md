# Research limitations

What was and was not done on 2026-11-06. Nothing here is presented as verified unless stated.

## Retrieved and used

World Bank WDI (population, growth, GDP per capita nominal and PPP, internet users), Unicode CLDR territory language data, Eurostat citizenship stocks, and the client's own benchmark and registry files.

## Research gaps (not accessed, not estimated)

| Gap | Why |
|---|---|
| Dubai buyer nationality from transactions (DLD, Dubai Pulse, DXBinteract) | No verified nationality-level series was obtained. `dubai_transaction_buyer_origin_evidence` is `unavailable` for every country. |
| Per-country Dubai search interest beyond the 15 reported countries | Only the client's secondary DXBinteract summary exists. It is search interest, not purchases. |
| HNWI counts and outbound investment | Paid or restricted sources (Knight Frank, Henley, Wealth-X). Not scraped. |
| Knight Frank survey figures | Only coverage (India, UK, Saudi Arabia, China, Hong Kong, Singapore) is noted. No figures were extracted. |
| JLL, CBRE, Savills buyer-origin data | Restricted or not accessed. |
| UN DESA bilateral migrant stock | The download returned HTTP 403 to scripted access. It was not worked around. Manual download required. |
| Diaspora outside EU/EFTA (UK, USA, Canada, Australia, Gulf) | Depends on the gap above or national statistics. |
| First-language, second-language and native speaker counts | CLDR does not split them; no source of consistent definitions was accessed. |
| EF English Proficiency Index | Not accessed. Left blank, not recalled. |
| Meta CPM, Google CPC, Keyword Planner volumes | No credible open dataset. Google Keyword Planner needs Google Ads API access (developer token and OAuth) that this project does not have. The CPL file never uses CPC as CPL. |
| Measured CPL for any individual country | None supplied. |
| Country-specific buyer motivations | Only market-wide findings were found. The motivations factor is missing for every country. |
| Wealth distribution (top shares), HNWI counts, outbound property investment by country | Paid or restricted sources. The affluent population is a modelled proxy from consumption and Gini. |
| Capital controls, payment access, sanctions detail | IMF AREAER not accessed. Six flags are from general knowledge and unverified. |
| Growth of Dubai interest over time, competitor presence | No time series or competitor data obtained. |
| Knight Frank per-country intent beyond Saudi, East Asia, UK | The infographic PDF could not be mapped label-to-number; figures came from secondary summaries. India's percentage was not read. |

## Cautions

- All 181 modelled CPLs are low-confidence ranges from an income factor, not observations.
- The list of ad-restricted markets was compiled from general knowledge and is unverified.
- CLDR language shares describe the general population. Dubai investors are an affluent segment; real English reach among them is likely higher than CLDR shows in some countries.
- The Dubai demand ranks in the registry cover 15 countries only. Countries without a signal are not "low demand"; they are unknown, and their score carries lower evidence.
- The close rate is one illustrative global rate (default 1.5%, owner's instruction; the original discussion was about 2%). The 19-case timing sample has an unconfirmed denominator.
