# Handoff: THE GAFFER — UI/UX Redesign

> **App name:** the platform is branded **THE GAFFER** (homepage hero: `THE` in ink + `GAFFER`
> in accent). Tagline: *BUILD · SIMULATE · ANALYSE*. It is a football data, analytics &
> season-simulation platform. (The repo was previously called "Sportlytics"; the bundled prototype
> files still use that filename — treat **THE GAFFER** as the product name.)

## Overview
A full visual redesign of **THE GAFFER** — covering the analytics side (Dashboard, Team Analytics,
Predictions, Custom Metrics, Standings) **and the flagship Season Simulator** (Setup → Squad →
Simulate → Analytics). The redesign replaces the generic navy + teal theme with a bold, editorial
sports aesthetic: warm near-black surfaces, a single electric-lime accent, heavy condensed display
type, and a monospace numbered navigation. **The reference screenshot that drove this design is the
Simulator's Setup screen** (see screen 06).

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a clickable
prototype showing the intended look and behaviour. They are **not** production code to copy
verbatim. The task is to **recreate this design inside the existing codebase**
(Next.js 14 App Router + TypeScript + Tailwind CSS + Recharts) using its established patterns,
components, and real API data. Keep all current routes, data fetching, and API contracts; only
the presentation layer changes.

> **Note (scope):** the bundled HTML prototype currently visualises screens 01–05. Screen 06
> (Simulator) is fully specified in this README from the live `app/simulator/page.tsx` — apply the
> same lime token system to it. The existing simulator already uses the OLD teal accent
> (`#00d4aa`); the redesign swaps it to lime (`#c8f23a`) and the type system below.

## Fidelity
**High-fidelity.** Exact colors, typography, spacing, and interaction states are specified below.
Recreate pixel-closely using Tailwind + the existing component structure. The prototype uses mock
data; wire the real endpoints (`/api/dashboard`, `/api/analytics/teams`, `/api/predictions`,
`/api/custom-metrics`, `/api/standings`, `/api/sofifa/teams`, `/api/sofifa/players`, …) back in.
The simulator's maths (`lib/gaffer-engine.ts`: `simulateSeasonFull`, `runMonteCarlo`,
`computeTeamRatings`, `buildTeamList`) and config (`lib/gaffer-data.ts`: `FORMATIONS`,
`CLUB_COLORS`, `LEAGUE_CONFIG`, `FALLBACK_POOL`) stay **exactly as-is** — this is a styling pass.

---

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `bg` | `#0b0c08` | App background (warm near-black) |
| `panel` | `#13140e` | Card / panel surface |
| `panel-2` | `#191b11` | Inset surfaces, inputs, fixture cards |
| `elev` | `#1d1f14` | Raised elements |
| `border` | `rgba(255,255,255,.07)` | Default hairline border |
| `border-2` | `rgba(255,255,255,.13)` | Hover / input border |
| `ink` | `#f4f5ec` | Primary text |
| `muted` | `#8d8f7e` | Secondary text |
| `muted-2` | `#5f6052` | Tertiary / labels |
| **`lime` (accent)** | `#c8f23a` | Primary accent — active nav, points, CTAs, leader |
| `lime-ink` | `#0b0c08` | Text on lime fills |
| `w` (win) | `#74e6a4` | Wins, positive GD, clean sheets |
| `d` (draw) | `#9ea08e` | Draws |
| `l` (loss) | `#f5837f` | Losses, negative GD |
| chart blue | `#5aa9f0` | Away-win probability, Europa zone |

Background carries a subtle lime glow: `radial-gradient(120% 80% at 80% -10%, rgba(200,242,58,.05), transparent 60%)`.

### Typography
- **Display** (headlines, big numbers): **Anton**, uppercase, `letter-spacing:.5px`, `line-height:.9`.
  Headline size `clamp(40px, 6.4vw, 82px)`.
- **UI / body**: **Archivo** (weights 400–900).
- **Labels / mono** (eyebrows, nav numbers, stat labels, formulas): **JetBrains Mono**,
  uppercase, `letter-spacing:.06–.14em`.
- Google Fonts: `Anton`, `Archivo:wght@400..900`, `JetBrains+Mono:wght@400;500;700`.

### Radius & spacing
- Cards/panels: `border-radius:16px`. Inset cards: `12–14px`. Chips/buttons: `7–9px`. Pills: `99px`.
- Page max-width `1240px`, padding `38px 28px 90px`. Panel padding `22px`. Grid gaps `12–18px`.

---

## Global Layout

### Top Nav (sticky)
- Height `64px`, `background:rgba(11,12,8,.86)` + `backdrop-filter:blur(14px)`, bottom hairline border.
- **Wordmark**: `THE` (ink) + `GAFFER` (lime) in Anton, ~24px, uppercase. Optional mono subtitle
  `BUILD · SIMULATE · ANALYSE` in `muted-2`.
- **Tabs**: monospace, uppercase, each prefixed by a 2-digit number (`01 DASHBOARD`, `02 ANALYTICS`,
  `03 PREDICTIONS`, `04 METRICS`, `05 STANDINGS`, `06 SIMULATOR`). The number is bold and dimmed.
  Active tab = solid lime fill with dark text; inactive = muted, hover lightens + faint bg.
- **Right side**: `user.email` + role tag (lime pill, e.g. `ADMIN`) + outlined `LOGOUT` button.
  (Maps to existing `components/Navbar.tsx` — keep auth/me + logout logic, restyle. Add the
  `/simulator` link to the nav array if not already present.)

### Page header pattern (every screen)
1. **Eyebrow**: lime monospace label with a lime-filled number chip (e.g. `[02] TEAM ANALYTICS`).
2. **Display headline**: Anton, two lines, e.g. "EVERY CLUB, / EVERY METRIC."
3. **Lede**: muted, max-width ~620px.

### Home / landing  (`app/page.tsx`)
- Centered hero: a small lime pill badge (`FOOTBALL DATA & ANALYTICS`), a massive Anton hero
  `THE GAFFER` (`THE` ink, `GAFFER` lime), a muted lede, then two CTAs — lime
  **`EXPLORE THE DATA`** (→ `/dashboard`) and an outlined **`OPEN SIMULATOR`** (→ `/simulator`).
- Below: a 4-up feature grid — Analytics & Insights, Results & Standings, Custom Metrics,
  Season Simulator. Replace the emoji icons with simple lime line-icons or keep minimal.
- Drop the multi-colour radial blobs; use the single subtle lime glow from the token section.

---

## Screens

### 01 · Dashboard  (`app/dashboard/page.tsx`)
- **Stat row**: 4 cards (`Clubs Tracked`, `Matches Played`, `Predictions`, `Goals Scored`).
  Big Anton number (46px), mono uppercase label, a `3px` lime gradient bar pinned to card bottom.
- **Two-column grid**:
  - *Recent Results* panel: rows of `crest — team — score — team — crest — date`. Winner team name
    in ink, loser muted. Score in Anton. Hairline dividers.
  - *Points · Top 6* panel: horizontal **rank bars** (rank, club code in Anton, track + fill, value).
    Leader's bar is lime, rest are white@22%. Below: a **leader callout** (crest, "LEAGUE LEADER",
    club name, big lime points value).
- **Upcoming Fixtures**: 4-up grid of cards — mono date/time, then `crest+code  V  crest+code`.

### 02 · Team Analytics  (`app/leaderboard/page.tsx` — route `/leaderboard`, labelled "Analytics")
- **Toolbar**: a `CUSTOM METRIC` `<select>` (None + team-scoped metrics) and a `SORT BY` row of
  pill chips (Points, Goals For, Goal Diff, Win Rate, Goals/Match, Clean Sheets). Active chip = lime.
  When a metric is selected, an extra amber-less **lime ★metric chip** appears and becomes the sort.
- **Card grid** (3-up → 2 → 1): per-team card with
  - top row: 2-digit rank (Anton, muted), crest, name + city, big lime points value.
  - optional **metric strip** (lime-tinted) showing `★ name`, the formula, and the computed score.
  - **W/D/L** four-stat strip (MP / W=green / D / L=red, Anton numbers).
  - **mini-grid** 2×3: Win Rate, Goal Diff (±colored), Goals F/A, Avg/Match, Clean Sheets (green),
    Failed to Score (red).
  - footer: `LAST 5` + form chips (W/D/L rounded squares, color-coded).
  - a club-colored `3px` accent bar at the card bottom.

### 03 · Predictions  (`app/predictions/page.tsx`)
- Header has a lime **`+ NEW PREDICTION`** button on the right.
- **Prediction cards**: top row `crest+home — predicted score (Anton) "PREDICTED" — away+crest`.
  Then a **probability bar**: 3 segments (home=lime, draw=muted, away=blue) with a 2px gap, mono
  legend underneath. Footer: explanation text (muted) + an outlined **confidence badge** (lime border/text).

### 04 · Custom Metrics  (`app/metrics/page.tsx`)
- **Two columns**:
  - *Metric Builder* panel: `NAME` input, `FORMULA` textarea (lime monospace), a lime-tinted
    **live preview** ("PREVIEW (TOP CLUB)" → computed value), a wrap of **variable chips**
    (tap to insert: `goals_for`, `goals_against`, `goal_difference`, `wins`, `draws`, `losses`,
    `win_rate`, `matches_played`, `clean_sheets`), an **operator row** (`+ − × ÷ ( )`), and a
    full-width lime **SAVE METRIC** button.
  - *Saved Metrics* list: each card shows name + scope tag, the formula (lime mono), description,
    and a `RESULTS` toggle button. Expanding reveals a ranked results table (rank, crest, name,
    MP, score in Anton).

### 05 · Standings  (`app/standings/page.tsx`)
- Single full-width **table** inside a panel. Columns: `# · CLUB · MP W D L GF GA GD · FORM · PTS`.
  Mono uppercase header. Rank cell has a left 3px **zone bar**: lime = top 4 (UCL), blue = 5th (Europa),
  red = bottom 3 (relegation). Leader row tinted lime; PTS in Anton (lime for leader). Legend below.
  Min-width 720px with horizontal scroll on mobile.

### 06 · Season Simulator  (`app/simulator/page.tsx`) — FLAGSHIP, matches the reference screenshot
A self-contained 4-step flow with its own **sub-tab bar** (not the global nav). Steps gate
forward: Squad needs a league; Simulate needs a full XI; Analytics needs a simulated season.

**Sub-tab bar** (top-right): four pills `01 SETUP · 02 SQUAD · 03 SIMULATE · 04 ANALYTICS`, mono
uppercase. Active = lime fill / dark text. Disabled steps = `muted-2`, not clickable. Sits in a
`panel`-toned rounded container with `4px` padding.

Each step opens with the standard **eyebrow + display headline** pattern (e.g. eyebrow
`STEP 01 — CHOOSE YOUR STAGE`, headline `PICK A LEAGUE. / BUILD YOUR CLUB.`).

**① Setup**
- **League cards** — 5 of them (England · Premier League, Spain · La Liga, Germany · Bundesliga,
  Italy · Serie A, France · Ligue 1). Each card: country eyebrow (mono, `muted-2`), league name in
  Anton, a mono sub-line `N clubs · N games` (and/or `Top N → UCL · N relegated`), a top-right
  radio circle that fills lime with a `✓` when selected, and a **club-colour gradient underline
  bar** at the bottom. Selected card = lime border + faint lime bg + soft lime shadow.
- **"YOUR CLUB" panel**: `CLUB NAME` text input (max 22 chars, placeholder "e.g. Banjar Athletic");
  `CLUB COLOUR` row of ~10 rounded swatches (from `CLUB_COLORS`, selected one ringed white + scaled);
  `FORMATION` 6-up grid of buttons (`4-3-3`, `4-4-2`, `4-2-3-1`, `3-5-2`, `3-4-3`, `5-3-2`) each
  showing the name (Anton/mono) + a `N DEF · N ATT` sub-label, selected = lime.
- Footer: lime **`BUILD THE SQUAD →`** button (disabled until a league with data is picked) + mono
  status text (`Select a league to continue` / `{league} · {n} clubs — name optional`).
- If a league has no seeded data, show a warning strip linking to Admin → SoFIFA Sync.

**② Squad**
- Headline `PICK YOUR {CLUBNAME}` (club name in lime).
- **Left — pitch**: a tall pitch panel (`aspect-ratio 3/3.7`) with a mown-stripe background and
  faint centre line / box. Each formation slot is an absolutely-positioned circular token at its
  `%` coords: **filled** = solid club-colour fill, dark text, player's last-name initials, with a
  small lime OVR badge top-right; **empty** = dashed muted ring with a `+`. Player name (or position
  code) sits under each token with a text-shadow. Below the pitch: `⚡ Auto-pick league stars` and
  `Clear` outline buttons, then a 5-up **tier-fill** row (`World 89 · Elite 84 · Strong 79 ·
  Solid 74 · Plucky 69`) to bulk-fill empty slots.
- **Right — team rating**: panel with a huge lime **Overall** number (Anton, ~60px), `n/11 picked`,
  and `±x vs avg · best {n}` in green/red mono. Below, 3 stat tiles **Attack / Midfield / Defence**
  (mono numbers, colour-coded). Then a full-width lime **`GO TO SIMULATION →`** button (disabled
  until XI is full).
- **Player-picker modal**: dark overlay + blurred bg; card titled "Pick a player" + position label;
  a search input; a scrollable list of player rows (lime OVR chip, name, club sub-text) — clicking
  assigns; plus a **"create your own"** block (name input + a lime range slider for rating + `Add`).

**③ Simulate**
- Headline `SIMULATE`. Two side-by-side panels:
  - **① Headline season** — copy + lime `▶ Simulate one season` button (one full campaign → table,
    fixtures, xG, contributions).
  - **② Monte Carlo** — a `Number of seasons` select (200 / 500 / 1000 / 2000), a lime
    `▶ Run Monte Carlo` button, and a **progress bar** (lime gradient fill) that animates as it runs.
- Mono status line below (e.g. `✓ 500 seasons simulated. Avg finish 6th · title 4.2%`) and a
  `View analytics →` outline button.

**④ Analytics**
- Headline `ANALYTICS`. **KPI grid** (2–3 up): League finish (ordinal), Goals F-A, Finishing vs xG,
  and — once Monte Carlo has run — Title probability, Top-N/UCL %, Avg finish. Big lime numbers,
  mono sub-lines.
- **Final league table** panel: columns `# · Club · P W D L GF GA GD xG Pts`. Zone tints —
  continental/UCL, Europe, relegation — plus the user's row tinted lime with a left lime border and
  a club-colour dot. Legend row beneath.
- **Charts (Recharts, themed)** — keep all four, re-skinned to the tokens (grid `rgba(255,255,255,.06)`,
  axis text `muted`, tooltip bg `#13140e` / lime-ish border, user series = club colour, others muted):
  1. *Title race* — horizontal bar of final points per club, user bar highlighted.
  2. *xG vs actual goals* — scatter with a diagonal reference line; user club a diamond in club colour.
  3. *Your title charge* — line of cumulative points vs league-average pace.
  4. *Where you finish* — Monte Carlo bar of finish-position frequency (lime for continental,
     red for relegation).
- **Fixtures & results** list (recent-form W/D/L chips + per-matchday rows) and a **Player
  contributions** list (modelled goals + assists per XI player).
- Footer disclaimer chip: `Independent model` + the existing fan-made/Poisson explanation text.

---

## Interactions & Behavior
- **Nav**: client-side tab switching; in the real app these are Next.js routes (`<Link>`), so keep
  route-based nav and just restyle active state to the lime fill.
- **Entrance**: each screen does a subtle `translateY(7px) → 0` over `.4s ease` with `fill: both`,
  gated by `@media (prefers-reduced-motion: reduce)`. **Do not animate opacity from 0** as the base
  state — keep content visible by default (this caused a blank-screen bug in the prototype).
- **Analytics**: selecting a metric auto-switches sort to that metric; clearing reverts to Points.
  Sorting is client-side on the fetched team array; tiebreaker = goal difference.
- **Metrics builder**: variable/operator chips append to the formula string; preview recomputes live.
  In production, evaluate via the existing `expr-eval`-based engine / `/api/custom-metrics/[id]/results`.
- **Hover**: team cards lift `translateY(-2px)` + brighter border; chips/links shift to ink/lime.
- **Simulator step gating**: Squad disabled until a league with data is selected; Simulate disabled
  until all 11 slots are filled (`ratings.filled === 11`); Analytics disabled until a season exists.
  Keep every existing handler (`selectLeague`, `autoFill`, `fillTier`, `openPicker`, `assign`,
  `runOne`, `runMC`) — only the markup/classes change. The Monte Carlo progress callback drives the
  lime progress bar width.

## State Management
Unchanged from current app — keep all `fetch` calls and `useState`/`useEffect` data loading. This is
a styling pass. Recharts can stay for any charts, themed to the tokens above (lime primary, blue
secondary, `#13140e` tooltip bg).

## Theming approach (recommended)
Add the tokens to `tailwind.config.ts` under `theme.extend.colors` (replace the existing `sport`
palette) and set the three font families via `next/font` (Anton, Archivo, JetBrains_Mono). Then update
each page/component to the classes described. Most current structure maps 1:1 — it's largely a
token + class swap plus the nav and card restyles.

## Files in this bundle (design reference)
- `Sportlytics.html` — entry; contains the full CSS design system + Google Font imports.
- `app.jsx` — nav, routing, and the Tweaks (accent/font/tone) controls.
- `screens.jsx` — the analytics screens (Dashboard, Analytics, Predictions, Metrics, Standings).
- `ui.jsx` — shared bits: `Crest`, `FormDots`, `Eyebrow`, `ProbBar`, `RankBars` + color helpers.
- `data.js` — mock data shaped to mirror the real API responses (use as a fixture reference).

(The HTML filename is `Sportlytics.html` for legacy reasons; the product is **THE GAFFER**.)

## Real codebase touch-points
- **Pages to restyle:** `app/page.tsx`, `app/dashboard/`, `app/leaderboard/`, `app/predictions/`,
  `app/metrics/`, `app/standings/`, **`app/simulator/page.tsx`** (the big one), plus
  `app/results/`, `app/teams/`, `app/players/`, `app/login/`, `app/register/` for full coverage.
- **Components:** `components/Navbar.tsx`, `StatCard.tsx`, `ProbabilityBar.tsx`, `MetricBuilder.tsx`,
  `StatusBadge.tsx`, `Badge.tsx`, `LeagueSeasonSelector.tsx`.
- **Do NOT touch logic:** `lib/gaffer-engine.ts`, `lib/gaffer-data.ts`, the `app/api/**` routes,
  the EA FC26 CSV seed data, or Prisma. Theme only.
- **Theme setup:** add tokens to `tailwind.config.ts` (replace the `sport` palette), load the three
  fonts via `next/font`, and restyle `app/globals.css` (`--background:#0b0c08`, `--foreground:#f4f5ec`).

Open `Sportlytics.html` in a browser to interact with the reference and toggle the Tweaks panel.
