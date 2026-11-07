# 02 — Claude Code Working Rules

## Feature scope

Work only on the dedicated `/dubai/analysis` Market Planning Studio unless the owner explicitly authorizes a wider change.

The feature belongs to:

`web-apps/voiceestate-ai/`

Its product knowledge, UX rules and supporting data belong in:

`web-apps/voiceestate-ai/docs/dubai-analysis/`

## Independence from the main workspace

This feature is a separate dashboard experience. Its visual design, component patterns, information architecture, copywriting and interaction model are governed by this folder—not by the design style of unrelated VoiceEstate AI screens.

Read the root `README.md` and existing project instructions for genuine technical constraints, such as:

- Framework and routing rules.
- Existing authentication and authorization behavior.
- Data access and API conventions.
- Existing state-management conventions.
- Build, lint and test commands.
- Deployment and security requirements.
- Restrictions that apply to dependencies or shared infrastructure.

Do **not** interpret general project documentation as a requirement to make this dashboard static, table-only, non-interactive or visually identical to another module unless it explicitly and technically requires that behavior.

Do not bypass security, authentication, accessibility or architectural constraints to achieve visual independence.

## Isolation rules

- Keep route-specific styling scoped to the Market Planning feature, preferably with CSS modules or a root feature namespace such as `.market-planning`.
- Do not modify global design tokens, global CSS, shared navigation, authentication, root layouts or unrelated modules unless technically necessary and approved.
- Reuse existing infrastructure where appropriate, but create feature-specific UI components when another module's components cannot deliver the intended experience.
- Do not introduce a new UI library or charting library before checking which packages are already installed and approved.
- Avoid duplicate functionality. Prefer the project's current charting, animation and state tools if suitable.
- Preserve the existing login gate. Never hardcode the supplied username/password in source files or docs.
- Do not log sensitive client data or credentials.

## Critical workflow: one UI piece at a time

Previous attempts to rebuild the whole page caused wasted effort. Do not repeat that pattern.

**At the start, inspect the current route, its current placeholder KPI card, relevant feature files and existing project constraints. Do not begin by rebuilding the page.**

Then follow this approval sequence:

1. Build or refine only the reusable forecast KPI card.
2. Run the route and inspect it at desktop and mobile widths.
3. Show the owner the result and wait for explicit visual approval.
4. Only after approval, proceed to the scenario builder.
5. Continue one component at a time using `09_BUILD_SEQUENCE_AND_ACCEPTANCE_TESTS.md`.

Do not create speculative placeholders for every future section just to make a complete-looking page. Do not add the next component before the current component is approved.

If the owner gives feedback, modify only the current component and any directly required local styles. Do not use feedback about one card as permission to redesign the entire page.

## First task after reading these files

Inspect the existing implementation and identify:

- Current route file and route guard.
- Current placeholder KPI-card component and styles.
- Existing chart, animation, icon and component dependencies.
- Any root documentation statements that genuinely constrain this feature.

Then implement **only the approved KPI card**. The card should demonstrate the visual system, not a full-page layout.

## Interaction requirements

Every visible control must have a real effect:

- Budget and lead-target modes must switch the relevant input and calculation.
- Preset choices must populate the input.
- Custom inputs must override presets.
- Market selections must change the portfolio and forecast.
- Language selections must update language-fit and serviceable-market results.
- Meta/Google allocation must sum to 100% and update the spend split.
- Scenario comparison must compare two actual model states.
- Expand/collapse controls must reveal meaningful explanations.

Do not add fake toggles, inert buttons, decorative dropdowns or hardcoded chart animations that do not reflect underlying data.

## Data and calculation requirements

- Keep benchmark data out of presentational components.
- Use one clearly defined source of truth for benchmark data and model calculations.
- Separate verified client data, external research, model assumptions and unresolved data.
- Store provenance and observation dates with research values.
- Use a pure calculation layer where possible so formulas can be unit-tested.
- Never derive an unsupported country CPL from a country's Dubai-demand score, GDP, wealth or language share.
- Follow `04_FORECAST_MODEL_AND_CALCULATION_RULES.md` exactly.

## Do not do these things

- Do not rebuild the entire dashboard in one pass.
- Do not replace the approved design with a generic admin template.
- Do not produce a plain table-only page.
- Do not add random gradients, excessive glassmorphism, noisy animations or arbitrary trend percentages.
- Do not assume a 50/50 channel split is the optimum for every country.
- Do not label a regional CPL as a country-specific measured CPL.
- Do not convert the 19-case sales timing percentages into lead-to-sale probabilities without confirmation.
- Do not use Meta's 15% and Google's 20% as a sales rate until their definition is confirmed.
- Do not claim that a planning preset is a platform minimum or a guaranteed minimum budget.
- Do not make the client select campaign maturity; show the comparison automatically.
- Do not alter unrelated routes or shared styles to solve a local visual issue.

## Delivery after each component

After each approved component, report:

- What component changed.
- What interactions work.
- What data/formulas it uses.
- What assumptions or unresolved data it displays.
- Desktop/mobile check performed.
- Any project files changed outside the feature folder and why.

Do not claim a visual check or test passed unless it was actually run.
