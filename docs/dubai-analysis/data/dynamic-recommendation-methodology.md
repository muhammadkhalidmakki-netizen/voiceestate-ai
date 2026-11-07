# Dynamic recommendation methodology (v2)

Code: `src/lib/market-planning/intel/recommend.ts` (pure engine), `intel/dashboard.ts` (bridge), planner state in `src/components/market-planning/planner-state.ts`. Config: `market-scoring-config.json`, model `buyer-opportunity-v2`.

Both scores are relative indicators. **Neither is a probability of sale**, a lead forecast or an ROI estimate.

## Thinking behind it

We are looking for countries that can produce Dubai off-plan **buyers**, not for the cheapest enquiries. Buyer potential and acquisition efficiency are scored separately. A low CPL cannot override strong buyer potential.

## 1. Buyer Opportunity Score (0-100)

| Factor | Weight | Input | Evidence confidence |
|---|---:|---|---:|
| Dubai buyer demand and property interest | 25% | DXBinteract-reported search-interest share, sqrt-normalised. Search interest, never transactions. | 0.7 |
| Purchasing power and wealth | 20% | percentile of GDP per capita PPP (World Bank) | 0.8 |
| International investment capability | 15% | mean percentile of outbound FDI % GDP and private credit % GDP; halved for possible sanctions or reported capital controls | 0.5 |
| Dubai investment and lifestyle motivations | 15% | documented, country-specific evidence only (none exists yet: see limitations) | 0.6 |
| Economic, currency and political conditions | 10% | growth, inflation, WGI political stability, currency move vs USD; only indicators dated 2024 or later | 0.7 |
| Affluent audience and diaspora | 10% | modelled affluent population (log scale) plus a discounted diaspora-pool bonus | 0.4 |
| Agent language compatibility | 5% | best selected language vs the market's languages | 0.6 |

```
score  = sum(w x s) / sum(w)        over factors that have data   (x100)
K      = sum(w x confidence) / sum(all w)                          (evidence confidence, reported separately)
```

A missing factor is excluded and lowers K. It is never zero. Below 50% of the weight available gives "Insufficient evidence" and no score.

### Ranking only: a cautious prior for gaps

When ordering markets, a missing buyer factor counts at 40% of a perfect score (`rank_missing_factor_prior`). Without this, a wealthy country with no Dubai signal would be renormalised onto its remaining strong factors and outrank a country with proven demand. The reported score does not use the prior.

## 2. Acquisition Efficiency Score (0-100), separate

| Factor | Weight |
|---|---:|
| Estimated CPL (client benchmark, estimate with margin, or the ceiling when only a ceiling exists) | 40% |
| Reachable online audience (population x internet users) | 20% |
| Language suitability (reachable language-matched pool) | 15% |
| Testing requirement (minimum practical test budget) | 15% |
| Search demand (same DXBinteract signal) | 10% |

Competition data is not available and is not invented. Advertising cost uses the CPL estimate; no separate CPM or CPC dataset exists. The CPL part of this score is what drives the lead side of the recommendation's utility; the other parts are the "other efficiency" multiplier.

## 2b. Affluent audience (one rule for every country)

Modelled affluent population = people with annual income above international $60,000 PPP, from a lognormal income distribution with GDP per capita (PPP) as the mean and a wealth-skewed Gini (survey Gini + 20 points, clamped 0.55-0.85, because survey Ginis understate wealth concentration). It replaced an earlier consumption-based version that collapsed for large, lower-income countries (India came out near zero). A proxy, not an HNWI count.

## 3. What the recommendation maximises

Goal: the best overall markets for the budget, with more leads, better buyer quality and therefore more and earlier sales. Not the cheapest leads, and not the richest countries.

```
quality q        = (buyer score with the missing-factor prior / 100) x (0.5 + 0.5 x buyer evidence)        0..1
utility per AED  = (q ^ 2 / CPL) x (0.85 + 0.15 x other efficiency) x 100      CPL = base, else the upper CPL
value of spend s = utility/100 x ( min(s, T) + 0.5 x max(s - T, 0) )            T = efficient spend of that market
T                = 2,000 x (0.5 + affluent-audience score)
```

- **Squaring quality** means a market must be both affordable and a real buyer market. A 3x cheaper CPL cannot rescue a weak buyer market (Sudan, Malawi and similar are never recommended). The exponent is configurable (`quality_emphasis`).
- **Diminishing returns** (T) is a planning assumption, not a measurement: more spend in one market buys less than the first slice. It is what makes bigger budgets spread across more markets with no fixed count. Large buyer markets absorb more spend than small ones.
- **Other efficiency** is reachable online audience, language-matched pool, testing requirement and search demand.

### How many markets, and the split

The engine tries 1 to 10 markets (best utility first), each needing its minimum test budget (`max(AED 1,000, 20 leads x upper CPL x (1 + 15% if modelled))`). For each size it gives every market its minimum, then spends the rest where the next AED adds most value, capped at 45% per market. It keeps the size with the highest total value. Never fewer than two markets when two proper tests are affordable. Pinned markets (user choices) come first. If even one market cannot meet its minimum, the top market is shown with a note.

**Equal shares are returned separately as a neutral alternative**, never as the recommendation, and the test suite checks the recommendation is at least as valuable.

### Honest limit

The dashboard forecast assumes a constant CPL at any spend, while the recommendation assumes diminishing returns. At large budgets a hand-built two-market plan in cheap-lead countries can therefore show more raw leads in the forecast than the recommendation, which trades some of that for quality and spread. Only real campaign data can settle which is right.

## 4. Sales contribution (illustrative)

```
country budget -> estimated leads (spend / CPL, a range) -> qualified leads (no validated rate: not applied)
               -> eventual sales (leads x ONE global close rate)
sales contribution = share of modelled sales from the conservative (upper-CPL) lead forecast
```

Contribution never uses opportunity scores. The close rate is one editable, provisional, global rate (default 1.5%); country-specific rates, qualification rates and the Meta 15% / Google 20% rates do not exist or are undefined and are not used. Country sales are illustrative, not guaranteed shares.

Close-rate provenance: the original client discussion used about 2%; the project owner then instructed 1.5% as the default in this project. The research docs in this repository state no close rate. The default stays 1.5%, editable in the planner.

## 5. Dashboard integration (backend only)

The dashboard used to start from nine countries in `recommended-portfolio.json` held in planner state, so changing the budget only rescaled the shares of the same nine. State now has `selection`:

- `recommended`: the market list is recalculated when budget, lead target, agent languages or planning CPLs change.
- `custom`: set by any manual change (add, remove, share slider, equalise). Explicit choices are preserved until "Reset to recommendations" (the existing reset action). Markets the user removed are kept in `excluded`.
- Plans saved before this change load as `custom`.

`DASHBOARD_USES_MODELLED_CPL` is `true`. Countries with no client benchmark use their modelled CPL range raised by a **20% safety margin** (`modelled_cpl_safety_margin`), labelled "Modelled estimate, low confidence". Precedence: client benchmark, then a CPL the user types in, then the modelled estimate. The margin is not applied to client benchmarks, the AED 30 ceiling or user CPLs, and the CSV itself is unchanged. Countries with no CPL at all (restricted ad markets, tiny territories) stay "research pending". Set the flag to `false` to return to client benchmarks only.

## How budget and language change the result

- Budget changes how many markets are tested and which ones.
- Language changes eligibility and serviceability and the diaspora reach: Arabic-only drops English-speaking markets and adds Gulf, North African and Arabic-diaspora European markets; French adds Belgium, Switzerland, Luxembourg and France.

## Future country-level outcomes

Add qualified-lead and sales columns from `client-cpl-input-template.csv`. Cost per qualified lead or per sale can then replace the CPL factor and the global close rate, without changing the score structure.
