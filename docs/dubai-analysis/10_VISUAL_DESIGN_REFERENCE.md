# 10 — Visual Design Reference & UI Quality Standard

## Purpose

This file defines the visual quality bar for `/dubai/analysis` (Prophunters Market Planning). It supplements the product and forecasting knowledge files. It is a design specification, not permission to build the whole dashboard at once.

**The supplied reference screenshots are the visual benchmark.** The previous generic mock-up of plain grey panels and four ordinary stat boxes is not an acceptable direction.

## 1. What the supplied references show

Treat the supplied screenshots as four related but distinct design references:

### Reference A — Zassk analytics dashboard

Visual characteristics:
- Cool, airy blue background with restrained gradients and soft blue illumination.
- Bright white cards sitting cleanly above the background.
- Strong, compact metric hierarchy: small label, large number, short supporting detail.
- Distinctive card silhouettes, including occasional stepped/notched edges rather than every card being an identical rectangle.
- Small, carefully designed visual indicators inside cards: segmented bars, dot matrices, short bar sequences and compact radial indicators.
- Rounded icon controls and pill-shaped navigation.
- A polished, slightly futuristic visual feel without excessive decoration.

What to borrow:
- The card craftsmanship, micro-visualizations, spacing, soft blue atmosphere and attention to detail.

What not to copy blindly:
- Do not use a large blue gradient behind every section if it reduces contrast or makes dense market data harder to read.
- Do not invent trend values or decorative graphs just to fill empty space.

### Reference B — Executive Business Dashboard

Visual characteristics:
- Very pale blue/grey application canvas and a clean white dashboard surface.
- A compact navigation rail and carefully aligned content grid.
- Multiple KPI cards with small contextual visualizations, not just oversized numbers.
- Fine typography, subtle separators and restrained use of blue.
- Clear large-scale hierarchy between headline KPIs, analytical charts and secondary insights.

What to borrow:
- The balance between information density and breathing room, consistent alignment, clean chart presentation and understated enterprise polish.

### Reference C — Sales Performance dashboard

Visual characteristics:
- Minimal, light interface with readable chart labels and a clear distinction between headline metrics and analytical detail.
- A strong grid, restrained accent color and low-noise surfaces.
- Charts and lists that have enough room to be understood.

What to borrow:
- Clarity, analytical hierarchy and disciplined use of whitespace.

### Reference D — Vixora dashboard

Visual characteristics:
- Soft neutral canvas, white/near-white content surfaces and subtle card separation.
- Simple icon navigation, strong page title and compact filter controls.
- A large primary analytical panel balanced by secondary panels.
- Clean typography, muted labels and one clear accent color.
- Charts with fine lines, quiet gridlines and carefully selected highlighted data.

What to borrow:
- Its restraint, navigation clarity, panel composition and calm professional feel.

## 2. Recommended visual direction for Prophunters

Use a **premium light analytics interface** as the primary design direction:

- Foundation: the clarity and composition of Vixora and Executive Business Dashboard.
- Detail quality: the KPI craftsmanship and micro-visualizations of Zassk.
- Chart treatment: the readable, low-noise analytical presentation of the Sales Performance and Vixora references.

Do not mash all references together indiscriminately. Establish one consistent design system. Use blue as the main accent, with restrained cool-blue gradients only where they add depth. The UI must remain neutral and independent of Prophunters' existing website or other application branding.

### Overall impression

The product should feel like a paid, high-quality business intelligence product used by a real estate investment or strategy team—not a generic admin template, not a marketing landing page, and not a collection of default component-library cards.

## 3. Visual design rules

### Canvas and surfaces

- Use a very light cool-grey or pale blue-grey application canvas.
- Use white or near-white surfaces for primary panels.
- Separate panels with subtle borders, very soft shadows, spacing and tonal differences—not thick outlines.
- Use gradients sparingly. They should create depth, not compete with data.
- Avoid pure-white page backgrounds with no hierarchy, and avoid saturated blue backgrounds behind dense information.

### Typography

- Use a modern, highly legible sans-serif already available in the project where possible.
- Establish a deliberate scale: page title, panel title, metric label, headline value, explanatory text and metadata.
- KPI values should be prominent, but labels and explanations must remain readable.
- Use tabular numerals for currency, percentages, lead counts and other changing figures.
- Avoid excessive font weights, all-caps labels everywhere, and oversized headings that waste dashboard space.

### Geometry and spacing

- Use a consistent spacing system and align card edges precisely.
- Use generous but controlled padding. Avoid both cramped cards and enormous empty panels.
- Rounded corners should feel intentional and consistent; use a small number of radius sizes.
- Cards may have distinct layouts or proportions when their information hierarchy differs. Do not make every card the same size by default.
- A subtle stepped edge, notch or layered detail may be used as a signature treatment on a primary KPI card, but only if it remains elegant and does not interfere with responsive layout.

### Color

- Use a restrained palette: cool neutrals, one primary blue accent, muted supporting blues and semantic status colors only when meaning is clear.
- Green is for a genuine positive state; amber is for a warning or unconfirmed state; red is for a genuine negative or error state.
- Never use green trend pills or upward arrows without a real comparison.
- Do not assign different bright colors to every market or chart series without a meaningful legend.

### Micro-visualizations

Use purposeful, compact visuals where they help explain a metric:
- Mini bar sequences for actual historical values.
- Segmented bars for a real allocation or comparison.
- Dot patterns for actual distributions or milestones.
- Small radial indicators only for a real percentage with a meaningful denominator.
- Sparklines only when there is a real time series.

Never generate fake sparkline data, random chart movements, meaningless dots, decorative percentages or fictional trend indicators. When no historical series exists, use a benchmark comparison, a clear label or no micro-chart.

### Controls and interaction

- Inputs, selectors, tabs, sliders and filters should look like part of the same designed product.
- Use clear active, hover, focus, disabled and selected states.
- Make controls compact but comfortably clickable.
- Use smooth, short transitions for value changes and panel updates. Motion must communicate a state change, not act as decoration.
- Tooltips and expandable explanations should explain a data point or calculation, not hide essential information.

## 4. The KPI card must meet this quality bar

The first deliverable is still **one reusable Forecast KPI Card only**. Do not build the whole dashboard to demonstrate the design.

The component must not look like a default rectangular card containing a label and a giant number. It should have a deliberately composed internal layout:

1. **Metric identity:** a precise, short label such as `Estimated leads / month`.
2. **Headline value:** the most visually prominent element, using tabular numerals.
3. **Context:** one short line explaining the selected budget, market or benchmark behind the estimate.
4. **Evidence/status label:** for example `Client benchmark`, `Regional estimate` or `Directional assumption`.
5. **Comparison or micro-visual:** only when supported by real values. For example, a New / Learning vs Mature comparison can be shown as two clearly labelled values or a compact comparison bar.
6. **Explanation affordance:** an optional unobtrusive info control that reveals the formula and source basis.

The card should support optional comparison and optional micro-visuals without leaving awkward blank areas when those options are absent. The layout must remain balanced at desktop and mobile widths.

### Example of a valid comparison

For a Europe scenario using AED 12,000 monthly spend and the supplied CPL benchmarks:
- New / Learning: AED 120 CPL → approximately 100 leads.
- Mature: AED 50 CPL → approximately 240 leads.

These figures are calculated from the supplied European benchmarks. If this example is used in a visual preview, label it as an illustrative Europe scenario. Do not generalize the learning CPL to other regions.

## 5. Avoid these design failures

The following are explicitly rejected:

- Generic four-card stat grids with identical plain rectangles and no information hierarchy.
- Default Tailwind dashboard layouts with minimal styling.
- A plain table-only interface.
- A pile of unrelated cards with no composition or visual rhythm.
- Random gradients, glassmorphism, blur or glow added everywhere.
- Excessive shadows, thick borders, oversized radii or childish colors.
- Fake growth percentages, invented trend pills, random sparklines or decorative chart data.
- Emoji used as icons in the product interface.
- A copied screenshot or pixel-for-pixel clone of a reference product.
- Changing global application styles or unrelated routes to achieve the look.

## 6. Implementation boundaries

- Read `AGENTS.md` and the installed Next.js documentation before implementation.
- Keep feature styles scoped to the Market Planning feature (for example, CSS Modules or the project's established scoped styling approach).
- Do not modify `src/app/globals.css`, root layout, unrelated components or other routes unless a genuine requirement is demonstrated and approved.
- Do not add a UI, chart, icon or animation dependency for the first KPI card unless there is a demonstrated need and approval.
- Use semantic, accessible HTML; keyboard focus must be visible.
- Ensure responsive behavior without weakening the desktop visual hierarchy.

## 7. Design review and approval protocol

For the first milestone:

1. Implement the protected route foundation as specified in the product brief, with credentials and session secrets configured outside source control.
2. Implement only the reusable KPI card and its isolated styles.
3. Render the card in a small preview composition on `/dubai/analysis` after authentication.
4. Use realistic, explicitly labelled sample data. Do not add other dashboard sections.
5. Run the available checks and report the exact files changed.
6. Present a screenshot for visual review.
7. Stop and wait for approval before building the next UI component.

Do not interpret this staged approval process as permission to repeatedly redesign the whole page. If the card is not approved, revise only the card and its directly related styles.

## 8. What Claude Code must say before coding

Before implementation, briefly confirm:
- It has read this visual design file and the product brief.
- It understands the visual direction: premium light analytics, Vixora/Executive layout clarity, Zassk-level KPI detail, and restrained chart styling.
- It will not use a generic dashboard template or build the full page.
- It will create only the login-protected route foundation and the first KPI card milestone, then stop for approval.
