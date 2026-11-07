# 07 — Data Dictionary and Schema

## General data rules

- Store numeric values as numbers, not formatted display strings.
- Store currency and units explicitly.
- Store dates in ISO 8601.
- Use ISO 3166-1 alpha-2 for country keys.
- Store source provenance with every external or client benchmark.
- Null means unknown or not supplied; zero means a verified zero. Never use zero to represent missing data.
- Keep user-facing labels separate from canonical field names.

## Canonical entities

### `regional_cpl_benchmark`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable benchmark key. |
| `region_key` | string | Europe, South Asia & Africa, North America, Oceania or UAE. |
| `country_codes` | string[] | Countries to which the benchmark may be mapped. |
| `cpl_low_aed` | number/null | Lower CPL bound where known. |
| `cpl_high_aed` | number/null | Upper CPL bound where known. |
| `cpl_point_aed` | number/null | Point benchmark where known. |
| `cpl_relation` | enum | `point`, `range`, `at_most`, `unknown`. |
| `campaign_stage` | enum | `mature`, `learning`, `unspecified`. |
| `source_type` | enum | `client_supplied`, `external_research`, `planning_assumption`. |
| `source_label` | string | Human-readable origin. |
| `source_date` | date/null | When benchmark was supplied or observed. |
| `scope_note` | string | Caveats and geography interpretation. |

### `country_market_profile`

| Field | Type | Meaning |
|---|---|---|
| `country_iso2` | string | ISO alpha-2. |
| `country_name` | string | Display name. |
| `world_region` | string/null | Geographic region. |
| `market_class` | enum/null | Core, Test, Watchlist, Not recommended/blocked, or null. |
| `research_status` | enum | Verified, external, directional, proxy, pending, stale. |
| `demand_signal_value` | number/null | Original value, never stripped from its definition. |
| `demand_signal_unit` | string/null | Percent, count, amount, index etc. |
| `demand_signal_type` | enum/string | Search interest, transaction share, investor count, HNWI intent, etc. |
| `demand_signal_period` | string/null | Observation period. |
| `client_region_proxy` | string/null | Region to which client benchmark may be mapped. |
| `country_cpl_low_aed` | number/null | Measured or externally sourced country CPL low. |
| `country_cpl_high_aed` | number/null | Measured or externally sourced country CPL high. |
| `cpl_status` | enum | Measured, regional proxy, external, assumption, unavailable. |
| `cpl_sample_size` | integer/null | Lead count or equivalent sample. |
| `cpl_date_range` | string/null | Observation window. |
| `capital_capacity_signal` | number/null | Normalized score or raw value with metadata. |
| `diaspora_signal` | number/null | Population count/score with definition. |
| `digital_reach_signal` | number/null | Platform or broad digital metric. |
| `competition_signal` | number/null | Scope-specific competition value. |
| `operational_serviceability` | enum | Full, limited, unsupported, unknown. |
| `overall_opportunity_score` | number/null | Only when evidence threshold is met. |
| `confidence` | enum | High, medium, low, insufficient. |
| `last_researched_at` | datetime/null | Last review time. |
| `source_ids` | string[] | References in source register. |
| `research_notes` | string | Human-readable explanation. |

### `language_market_profile`

| Field | Type | Meaning |
|---|---|---|
| `language_code` | string | ISO 639-1/BCP 47 language code. |
| `language_name` | string | Display name. |
| `country_iso2` | string | Country. |
| `relationship_type` | enum | Official, dominant, first language, spoken, second language, diaspora proxy. |
| `speaker_share_pct` | number/null | Share with a defined denominator. |
| `speaker_count` | integer/null | Direct speaker estimate where available. |
| `denominator_population` | integer/null | Denominator. |
| `definition` | string | What counts as a speaker. |
| `is_diaspora_proxy` | boolean | True when origin is used as a proxy, not direct language data. |
| `source_id` | string/null | Source register key. |
| `source_year` | integer/null | Reference year. |
| `confidence` | enum | High, medium, low, insufficient. |
| `notes` | string | Limitations. |

### `agent_language_coverage`

| Field | Type | Meaning |
|---|---|---|
| `language_code` | string | Language supported. |
| `proficiency` | enum | Fluent/native-level, professional, conversational. |
| `agent_count` | integer/null | Number of available agents. |
| `channels_supported` | string[] | Call, WhatsApp, email, documentation, etc. |
| `coverage_hours` | string/null | Service hours. |
| `serviceability_status` | enum | Full, limited, unsupported. |

### `scenario_snapshot`

| Field | Type | Meaning |
|---|---|---|
| `scenario_id` | string | Unique identifier. |
| `scenario_name` | string | User-provided or generated title. |
| `planning_mode` | enum | `budget` or `lead_target`. |
| `monthly_budget_aed` | number/null | Input or derived monthly budget. |
| `monthly_lead_target` | number/null | Input or derived lead target. |
| `month_days` | integer | Default 30. |
| `selected_countries` | array | Country code and budget share. |
| `selected_agent_languages` | array | Language code and proficiency. |
| `meta_share_pct` | number | 0–100. |
| `google_share_pct` | number | Must equal 100 minus Meta. |
| `benchmark_version` | string | Dataset version. |
| `assumptions` | array | Explicit model assumptions. |
| `unresolved_items` | array | Missing definitions/data. |
| `created_at` | datetime | Snapshot timestamp. |

## Data status enums

### Evidence status

- `verified_client`
- `external_research`
- `directional_external`
- `regional_proxy`
- `planning_assumption`
- `research_pending`
- `stale`
- `not_applicable`

### Confidence

- `high` — directly relevant, recent, transparent source/method and adequate sample.
- `medium` — credible source but indirect, limited sample or imperfect comparability.
- `low` — directional or secondary evidence with important limitations.
- `insufficient` — not enough evidence to create a reliable estimate.

## Source provenance requirements

Every numeric fact shown to the client should be traceable to:

- Source name.
- URL or internal client-data reference.
- Publication/observation date.
- Period covered.
- Geography.
- Metric definition and denominator.
- Whether the number is measured, a regional proxy or an assumption.
- Confidence.

## UI display rules

- `verified_client` → `Client benchmark`.
- `external_research` → `External research`.
- `directional_external` → `Directional market signal`.
- `regional_proxy` → `Regional benchmark proxy`.
- `planning_assumption` → `Planning assumption`.
- `research_pending` or `insufficient` → `Not yet validated`.
- `stale` → `Needs refresh`.

Do not show raw source ids to the client; show a source title, date and expandable methodology note.
