# Dubai Market Planning Studio — Knowledge Pack

**Project:** `voiceestate-ai`  
**Feature:** `/dubai/analysis`  
**Audience:** Prophunters client users and internal market-planning administrators  
**Purpose:** Product, UX, forecasting, market-research and implementation source of truth for this independent dashboard.

## Why this folder exists

The Dubai Market Planning Studio is a dedicated client-facing planning product. It is not a generic page in the main VoiceEstate AI workspace and it must not inherit unrelated dashboard layouts, branding choices, interaction restrictions or product assumptions from other modules.

Repository-wide instructions still apply where they govern security, architecture, coding standards, accessibility, deployment and existing technical constraints. This folder governs the **product experience and domain behavior** of `/dubai/analysis`.

Do not change the root `README.md` merely to make this feature look or behave differently. Read it for genuine repository-wide constraints, then follow this feature-specific knowledge pack for the planning tool.

## Read in this order

1. `01_PRODUCT_BRIEF.md` — what the product is, who it serves and what success looks like.
2. `02_CLAUDE_CODE_WORKING_RULES.md` — scope boundaries and the strict one-component-at-a-time workflow.
3. `03_UX_COPY_AND_EXPERIENCE.md` — interaction design, default recommendations and client-facing copy.
4. `04_FORECAST_MODEL_AND_CALCULATION_RULES.md` — formulas, scenario presets, maturity comparison, channel allocation and sales-timing rules.
5. `05_MARKET_RESEARCH_METHOD.md` — global country coverage, market scoring and evidence standards.
6. `06_LANGUAGE_AND_AGENT_COVERAGE.md` — language-led market discovery, diaspora logic and agent serviceability.
7. `07_DATA_DICTIONARY_AND_SCHEMA.md` — canonical field definitions and required metadata.
8. `08_RESEARCH_SOURCES_AND_EVIDENCE.md` — verified client inputs, external evidence and limitations.
9. `09_BUILD_SEQUENCE_AND_ACCEPTANCE_TESTS.md` — build sequence and definition of done.
10. `data/` — starter country registry, language-market research queue and benchmark facts.

## Current source-of-truth status

- The client's supplied regional CPL figures and 19-case sales-timing observations are transcribed in this pack.
- External market-demand indicators are directional evidence, not client campaign results.
- Country-level CPLs are **not** available for every country. Do not fabricate them.
- The meaning of Meta's 15% and Google's 20% working-lead rates is unresolved.
- The denominator and interpretation of the 19-case sales timeline need confirmation.
- The country registry covers 249 ISO 3166-1 country/territory entries as a research scaffold. Most rows are intentionally marked `research_pending`.

## Install into the repository

Copy this entire folder to:

`web-apps/voiceestate-ai/docs/dubai-analysis/`

On Windows, the equivalent path is:

`web-apps\\voiceestate-ai\\docs\\dubai-analysis\\`

Keep the files in this feature folder. Do not merge them into the root README or unrelated module documentation.

## Login and security

The local route is `/dubai/analysis`. Use the existing local development authentication flow and credentials supplied separately by the project owner. **Do not write passwords, tokens, session cookies or production credentials into these knowledge files, source code, screenshots, logs or commits.**

## Non-negotiable product principle

The dashboard must recommend a credible starting plan first, then let the client customize it. It must not force the client to make every strategic decision from a blank screen. The interface must clearly distinguish client facts, external research, model assumptions and unresolved data.
