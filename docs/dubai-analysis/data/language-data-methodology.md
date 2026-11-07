# Language and diaspora data methodology

Generator: `scripts/market-intel/build_datasets.py`.

## Default

The agent language default is **English only** (`language-master.csv`: `default_agent_language=true` only for `en`). The backend supports every catalog language so the existing settings can select more.

## Files

- `language-master.csv`: 62 languages with ISO 639-1 style code, ISO 639-3, native name, script, direction, and whether the current UI can select it.
- `country-language-distribution.csv`: 1,040 rows for 243 countries and territories.
- `diaspora-market-opportunities.csv`: cross-border language opportunities.

## Country language distribution

Source: Unicode CLDR `territoryInfo` (languagePopulation percent, official status), CLDR version recorded per row. Population denominator: World Bank (latest), else CLDR.

What CLDR measures: the percent of a territory's population that uses a language as a first **or** additional language. It does not separate the two.
So:

- `speaker_share_pct_total` is filled.
- `first_language_pct`, `second_language_pct` and `native_speakers` stay **blank in this file**. First-language percentages now live in `country-language-profile.csv` (below), from a different source and with their own year and definition. Nothing is estimated.
- `est_total_speakers` = share x population. It is derived and labelled as such.
- Rows below 1% are dropped unless the language is official there.
- English proficiency (EF EPI) is blank: the index was not accessible. It is not recalled from memory.
- Six territories have no CLDR language data and are not scored on language.

CLDR is a reference dataset, not a census. Some territory figures are old. Confidence is `medium` for official languages and `low` otherwise.

## Per-country primary and secondary languages (country-language-profile.csv)

One row per country per language, ranked, with a role: `primary` (rank 1), `secondary` (10% or more) or `minority`.

| Column | Meaning |
|---|---|
| `first_language_pct` | Share of the population whose first language (mother tongue or home language) it is. Source: CIA World Factbook (public domain), with `first_language_year` and `first_language_definition`. Blank when the country publishes no percentages. |
| `total_speakers_reach_pct` | Share who speak it as a first or additional language. Source: Unicode CLDR. Different measure: Urdu in Pakistan is a first language for 7.1% but understood by about 95%. |
| `selectable_language` | Which selectable agent language this counts towards (see families). |
| `official` | Official status where recorded. |

Coverage: 233 countries have Factbook language text; 109 give percentages; 124 only list the languages (no percentages: left blank). The rank uses first-language % when a country has it, otherwise reach %, so a rank is not comparable across countries.
Definitions vary by country (mother tongue, home language, or not stated: 220 of 233 do not say). Years vary (often 2010-2021). Both are stored per country; nothing is rescaled.

## Language families (language-families.csv, editable)

Related varieties count towards a selectable language with a weight, so "Punjabi" includes Western Panjabi (Lahnda, weight 1.0) and the related Saraiki and Hindko (0.7); "Arabic" includes Egyptian, Levantine, Gulf, Maghrebi and other dialects (0.7-0.9); spoken Hindi and Urdu cover each other (0.8); Hindi-belt languages count towards Hindi (0.5-0.7); Malay and Indonesian cover each other (0.8). These weights are planning assumptions from the linguistic literature, labelled as such in the file, not measurements. Edit them in the CSV and run the update.

The reach used for scoring is the largest of a language's own share and each related variety's share times its weight, per country.

## Minority languages spoken by millions

Serviceability is the larger of a share-based value and a pool-based value (0 at 1 million speakers, up to 0.6 at about 32 million). Punjabi is 2.8% of India but about 41 million people, so India is serviceable for Punjabi agents; a country with 3% Punjabi and a small population is not.

## Diaspora and cross-border opportunities

Method (EU/EFTA residence countries only):

1. Eurostat `migr_pop1ctz` gives the number of **citizens of country A living in country B** on 1 January (2025).
2. Country A's CLDR share for language L estimates how many of those citizens plausibly speak L.
3. `estimated_language_compatible_population` = citizen stock x share. This is a proxy.

Rules applied:

- Citizenship is not country of birth, and migration origin does not prove language proficiency. `confirmed_speaking_population` is always blank.
- The origin country and the residence country are separate columns. Language compatibility is separate from both.
- Only pairs with at least 3,000 citizens and at least 2,000 language-compatible people are kept.
- The client's own diaspora seeds (`language-market-seeds.csv`, for example Arabic in the UK and France, French in Canada) are preserved as qualitative `diaspora_origin_proxy_seed` rows with no counts.

### Not covered

- The UK, USA, Canada, Australia, the Gulf states and every other non-EU residence country. They need UN DESA International Migrant Stock (bilateral), which blocks scripted downloads, or national statistics (ONS, ACS, StatCan, ABS). Download the UN DESA file manually and add it as a new source.
- France publishes no citizenship stock in this Eurostat table, so Arabic in France is a gap, not zero.
- Same-language neighbours that are not captured by citizenship (for example naturalised citizens).
