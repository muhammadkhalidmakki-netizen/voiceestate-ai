# Paste this into Claude Code to start the Dubai Analysis work

You are working in `web-apps/voiceestate-ai`, on the dedicated client-facing route `/dubai/analysis`.

Read the complete feature knowledge pack in `docs/dubai-analysis/`, starting with `00_README.md`. These files define the product goal, UX behavior, calculations, research rules and component approval process for this route.

This is a separate Market Planning dashboard for Prophunters. Its user experience, UI/UX, copywriting, component patterns and visual direction are independent of unrelated VoiceEstate AI dashboard modules. The root `README.md` still applies to real repository-wide technical, security, architecture, build and deployment constraints, but do not let unrelated product styles or assumptions turn this page into a static generic admin screen. Do not change the root README to force this feature's design.

The local route is `http://localhost:3002/dubai/analysis`. Preserve the existing login gate and use the normal local development login flow. Never hardcode or commit credentials.

Important product direction:
- The client must open with a recommended, preselected market plan. Do not make the client invent the strategy from a blank form.
- The client can customize the recommended plan and multi-select countries from the worldwide country registry.
- Budget and monthly lead-target modes both need suggested presets and a custom override.
- Do not ask the client to choose New/Learning or Mature. Show a comparison automatically wherever both benchmark values exist.
- Meta/Google allocation is a spend split. Do not invent channel-specific leads when only a blended regional CPL is available.
- Language capability must influence serviceable market recommendations. Keep primary-language markets separate from diaspora-origin proxies.
- The 19-case sales data is currently a timing observation only. Do not calculate sales counts until the denominator and the working-lead-rate definitions have been confirmed.
- Keep all figures, sources and assumptions traceable. Missing values are null/unknown, never zero.

**Do not rebuild the entire page.** The previous full-page attempts were rejected. The project owner explicitly wants one UI piece built and approved at a time.

Your first task is only:

1. Inspect the existing `/dubai/analysis` route, authentication guard, placeholder KPI card, styles and current dependencies.
2. Read the root README and report only the technical constraints that genuinely affect this feature.
3. Refine or build only the reusable forecast KPI card, following the design and copy rules in `03_UX_COPY_AND_EXPERIENCE.md` and the approval sequence in `09_BUILD_SEQUENCE_AND_ACCEPTANCE_TESTS.md`.
4. Do not build the scenario builder, country selector, charts, sales timeline or full page yet.
5. Do not modify unrelated routes or global styles unless required and explicitly explained.
6. Run the relevant checks and inspect desktop and mobile layout. Do not claim checks passed unless they were actually run.
7. Present the completed KPI card for owner approval and stop. Do not proceed to another component without approval.

Before coding, identify the exact files you intend to change and explain why. Keep the implementation minimal and isolated.
