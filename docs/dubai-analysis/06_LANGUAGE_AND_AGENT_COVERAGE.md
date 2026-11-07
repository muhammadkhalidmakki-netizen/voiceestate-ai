# 06 — Language and Agent Coverage Model

## Goal

Use the languages the sales team can support to discover additional viable markets, including diaspora communities outside countries where the language is a primary or official language.

Example: Arabic capability should identify core Arabic-speaking markets and possible Arabic-speaking communities in France, Germany, the UK, the Netherlands, Sweden, Belgium, Canada, the United States and Australia. It must not assume that every person with an Arab-country origin speaks Arabic or is a property buyer.

## 1. Agent-language input

Ask the business to select the languages its sales agents can handle. Do not ask the client to self-identify personal language or ethnicity.

For each language, capture:

- Language code (BCP 47 or ISO 639-1 where available).
- Display name.
- Agent proficiency: fluent/native-level, professional, conversational.
- Number of available agents, optional.
- Coverage hours/time zone, optional.
- Whether a language-specific landing page or sales collateral exists.
- Whether the team can handle calls, WhatsApp, email and documentation in that language.

A language should be treated as fully serviceable only if the team can follow up and progress a lead in that language. The product may display `limited coverage` where only conversational support exists.

## 2. Market-language relationship types

Do not collapse these concepts into one language percentage:

- `official_language` — legally recognized official language.
- `dominant_language` — widely used in everyday life.
- `first_language` — self-reported mother tongue/first language.
- `spoken_language` — people report being able to speak it.
- `second_language` — learned or used as an additional language.
- `diaspora_origin_proxy` — population with a birthplace/citizenship/ancestry link to a language-origin country; not proof of speaking the language.
- `ad_language_available` — an ad/landing-page language the campaign can deliver and the team can serve.

Keep the denominator and survey definition with any share value. A percentage of mother-tongue speakers is not comparable with a percentage who can hold a conversation.

## 3. Language-driven country discovery

For each selected agent language:

1. Identify countries where the language is official or widely used.
2. Identify countries with meaningful diaspora populations from relevant origin countries.
3. Use census language statistics where available.
4. If language data is absent, use migrant-origin data only as a separately labelled proxy.
5. Cross-check the country against Dubai property demand, affordability and digital reach.
6. Check whether the sales team can service the time zone and sales journey.
7. Display the resulting markets in distinct groups: `Primary language markets` and `Diaspora opportunity markets`.

Language presence alone must never make a country a `Core` market. It is one factor in the broader market evaluation.

## 4. Arabic example

### Primary Arabic-language market candidates

Research first:

- Saudi Arabia
- United Arab Emirates
- Egypt
- Iraq
- Jordan
- Lebanon
- Kuwait
- Qatar
- Bahrain
- Oman
- Yemen
- Morocco
- Algeria
- Tunisia
- Libya
- Sudan

Do not assume equal purchasing power, equal Dubai buyer demand, equal CPL or equal media economics across these countries. Each is a separate market profile.

### Diaspora-market candidates

Research Arabic-speaking populations and relevant diaspora proxies in:

- France
- Germany
- United Kingdom
- Netherlands
- Belgium
- Sweden
- Switzerland
- Canada
- United States
- Australia

These countries are candidates for research, not pre-confirmed Arabic campaign markets. Use official census language tables where available, then UN DESA/Eurostat/OECD migrant-origin datasets as a proxy where no direct language-share measure exists.

### How to display the result

Example copy:

`Arabic coverage opens two types of opportunity: core Arabic-speaking markets and diaspora communities living in international markets. We keep these groups separate because language presence, Dubai property demand and acquisition cost are different questions.`

Do not combine the resident populations of the Arab world with diaspora estimates in Europe into one unexplained audience number.

## 5. Language opportunity calculations

When reliable direct language data exists:

`EstimatedLanguageAudience = CountryPopulation × ValidatedLanguageShare`

When only diaspora-origin data exists:

- Display `Diaspora-origin population proxy`.
- Do not call it `Arabic speakers`.
- Do not use it as exact ad reach.
- Keep the underlying origin countries and data year visible.

When no numeric estimate exists:

- Display the market as a qualitative language candidate.
- Set audience size to `Not available`.
- Do not invent a percentage.

If the platform's addressable audience estimate is available, store it separately from census population estimates. Ad reach is an advertising-platform estimate, not a census count.

## 6. Language and CPL

Language localization can affect campaign response, lead quality and sales readiness, but no language-specific CPL multiplier has been supplied.

Therefore:

- Do not automatically reduce CPL because an ad is in French, Arabic or another language.
- Do not automatically increase CPL because a market is multilingual.
- Do not apply a country language share as a multiplier to CPL.
- Treat language as a market eligibility, reach and serviceability dimension.
- Build language-specific CPL benchmarks only from campaign results with language identified.

## 7. Language research data requirements

Every numeric language record should include:

- `language_code`
- `language_name`
- `country_iso2`
- `relationship_type`
- `speaker_share_pct` (nullable)
- `speaker_count` (nullable)
- `denominator_population` (nullable)
- `definition` (mother tongue, speaks well, any ability, household use, etc.)
- `source_name`
- `source_url`
- `source_year`
- `observed_at`
- `confidence`
- `is_diaspora_proxy`
- `notes`

## 8. Research sources

Preferred sources:

- National census/statistical office language tables.
- Eurostat population by country of birth/citizenship and national census language data.
- UN DESA International Migrant Stock 2024 for origin/destination population context.
- OECD migration datasets for immigrant and foreign-born populations.
- Ethnologue or other specialist linguistic sources only when licensing and definitions are understood; do not quietly mix proprietary estimates with official census figures.
- Current ad-platform estimates for addressable reach, stored separately from population data.

## 9. Recommended UI behavior

- Show selected agent languages as compact chips with proficiency labels.
- Show primary language markets and diaspora candidates in separate tabs or grouped cards.
- Highlight whether each market is fully serviceable, limited or unsupported.
- Show audience estimates only where directly supported.
- Add a small `Why this market appears` explanation.
- Let the client include or exclude candidates from the selected plan.
- Keep the recommended plan restorable.
