# CPL estimation methodology

Model version `intel-2026-11-06-v1`. Currency AED. Research date 2026-11-06.
Generator: `scripts/market-intel/build_datasets.py`. Output: `country-cpl-estimates.csv`.

## What is and is not in the file

| Status | Meaning | Count |
|---|---|---:|
| `measured` | Country-specific campaign data. **None exists yet.** Add rows via `client-cpl-input-template.csv`. | 0 |
| `regional_proxy` | The client's blended regional benchmark, carried unchanged. | 13 |
| `modelled` | A cautious range derived from a regional anchor and an income factor. Low confidence. | 181 |
| `manual_research_required` | No defensible basis. No number is shown. | 55 |

Every row stores low, base and high CPL, relation (`point`, `range`, `at_most`), mature and learning status, measurement type, confidence, sources, research date and the method used.

## Evidence hierarchy applied

1. Country-specific campaign data: none yet.
2. Comparable Dubai real-estate campaigns in that country: none supplied.
3. Client regional benchmarks: Europe 50 (learning 120), India/Pakistan at most 30, USA/Canada 70, Australia/New Zealand 70, UAE 80-100. These stay exactly as supplied, including the open-ended "30 or less".
4. Comparable external real-estate campaign data: none found in open sources.
5. Country advertising cost and search-demand signals: no credible open Meta CPM or Google CPC dataset was available. Google Keyword Planner needs Google Ads API access that this project does not have.
6. Conservative modelled estimate (tier 6): used for the rest.

Google CPC and search volume are never treated as CPL.

## The modelled estimate

```
base = anchor_CPL x factor
factor = clamp( (GDP_per_capita_PPP / anchor_reference_GDP_PPP) ^ 0.20 , 0.55 , 1.35 )
high-income markets: factor = max(1.00, factor)      # never cheaper than the anchor
band: same region as the anchor  x0.75 .. x1.30
      borrowing another region's    x0.65 .. x1.50   (hierarchical: farther from evidence, wider band)
      nominal GDP only: bands widened a further 10%
```

- Anchor reference GDP is the median World Bank GDP per capita PPP of the countries that carry the client's benchmark in that anchor group.
- Anchors: Europe (50) for Europe, Asia, Middle East, Latin America and the Caribbean; North America / Oceania (70) for Northern America and Oceania; the South Asia and Africa ceiling (30) for Africa and Southern Asia up to GDP per capita PPP of 20,000.
- The exponent (0.20) is deliberately small. Income is a weak predictor of ad cost, so the model moves little and keeps wide ranges.

### The AED 30 ceiling

"AED 30 or less" is a broad benchmark. It is not applied as a measured CPL to every African country.
For Africa and Southern Asia countries below the income limit the file records the ceiling as `cpl_high = 30`, relation `at_most`, **no low CPL**. A low CPL would imply an upper bound on lead volume that the benchmark does not support. The indicative `cpl_base` (30 x factor, capped at 30) is used only for ranking.

### Left for manual research

- Countries whose Meta or Google ad access is restricted or needs confirmation: China, Russia, Iran, North Korea, Cuba, Syria. This list was compiled from general knowledge of platform policy and is not verified; confirm it against current Meta and Google policy and sanctions rules.
- Territories under 50,000 people or without World Bank indicators (for example Taiwan, which the World Bank does not report).

## Learning-phase CPL

Only Europe has a client learning CPL (120 for CH, DE, FR, LU, NL, NO). All other countries are `not_supplied`. The model does not extrapolate a learning multiplier.

## Hierarchy

Every modelled country stays anchored to a client regional benchmark. A country in the anchor's own region gets a tighter band than one that borrows a distant region's benchmark (for example Singapore borrowing the Europe benchmark). The learning/mature ratio is not assumed to be the same everywhere: only Europe has a learning CPL, and nothing is extrapolated from it.

Meta and Google CPL are not split: no platform-specific evidence exists.

## Not modelled

Country differences in CPM, CPC, lead form quality, competition, seasonality and platform mix. Meta's 15% and Google's 20% working-lead rates are not used (definition unresolved).

## How real data replaces the model

Fill `client-cpl-input-template.csv` (see its columns) and, when you have real campaigns, the estimator should prefer a measured CPL over the proxy and model. The tier order above is the rule; `measured` rows will carry `evidence_tier` 1 or 2.
