# Claude Code prompt — THE GAFFER redesign

Paste everything inside the box below into Claude Code, with this repo open and the
`design_handoff_sportlytics_redesign/` folder unzipped at the repo root.

---

```
You are restyling my Next.js app "THE GAFFER" (football data, analytics & season-simulator).
A complete design spec lives in design_handoff_sportlytics_redesign/. Do this first:

1. Read design_handoff_sportlytics_redesign/README.md in full.
2. Open design_handoff_sportlytics_redesign/Sportlytics.html in a browser (or read its <style>
   block + screens.jsx/ui.jsx) to see the target look. This is the visual source of truth.

GOAL
Apply this redesign across the app: warm near-black surfaces, ONE electric-lime accent,
heavy condensed display type (Anton), Archivo for UI, JetBrains Mono for labels. It replaces
the current navy/teal theme. This is a PRESENTATION-LAYER change only.

HARD RULES
- Do NOT change any logic, data fetching, API routes, or types. Keep every existing handler,
  hook, and fetch call. Files that are OFF-LIMITS for behavior changes: lib/gaffer-engine.ts,
  lib/gaffer-data.ts, app/api/**, prisma/**, the EA FC26 CSVs. Theme/markup only.
- Swap the old teal accent #00d4aa to lime #c8f23a everywhere (incl. the simulator).
- Keep routes and route-based navigation; only restyle active/hover states.
- Do NOT use an opacity:0 base state for entrance animations (keep content visible by default;
  animate a small translateY instead, gated by prefers-reduced-motion).

DESIGN TOKENS (from the README)
- bg #0b0c08 · panel #13140e · panel-2 #191b11 · border rgba(255,255,255,.07) ·
  border-2 rgba(255,255,255,.13) · ink #f4f5ec · muted #8d8f7e · muted-2 #5f6052
- accent lime #c8f23a (text-on-lime #0b0c08) · win #74e6a4 · draw #9ea08e · loss #f5837f ·
  chart-blue #5aa9f0
- radius: cards 16px, inset 12-14px, chips/buttons 7-9px, pills 99px
- subtle bg glow: radial-gradient(120% 80% at 80% -10%, rgba(200,242,58,.05), transparent 60%)

SETUP STEP (do this, then STOP and show me before continuing)
1. tailwind.config.ts — replace the `sport` palette with the tokens above.
2. Load fonts via next/font in app/layout.tsx: Anton (display), Archivo (UI), JetBrains_Mono
   (labels). Wire CSS variables and set Archivo as the body font.
3. app/globals.css — set --background:#0b0c08, --foreground:#f4f5ec, add the bg glow.
4. components/Navbar.tsx — wordmark "THE" (ink) + "GAFFER" (lime) in Anton; numbered monospace
   tabs (01 DASHBOARD … 06 SIMULATOR); active tab = solid lime fill / dark text. Add the
   /simulator link if missing. Keep all auth (me/logout) logic.

Show me the diff for these 4, let me approve, THEN continue.

THEN, one page at a time (pause for review after EACH):
- app/page.tsx          → Home hero (screen "Home" in README)
- app/dashboard/        → screen 01
- app/leaderboard/      → screen 02 (Team Analytics)
- app/predictions/      → screen 03
- app/metrics/          → screen 04
- app/standings/        → screen 05
- app/simulator/page.tsx → screen 06 (the big one: Setup/Squad/Simulate/Analytics sub-tabs,
                            player-picker modal, pitch, KPI grid, Recharts re-skin). Restyle
                            ONLY; the engine + data stay untouched. Re-theme Recharts to the
                            tokens (grid rgba(255,255,255,.06), tooltip bg #13140e, user series
                            = club colour, others muted).

For each page: match the README's per-screen spec closely (layout, type scale, colours,
hover/active states). Reuse the shared patterns (eyebrow + Anton headline + lede; the crest
chip; W/D/L form chips). Verify it builds (npm run build or tsc) before declaring a page done.

Start now with the SETUP STEP only.
```

---

## Tips
- Keep it **one page per review** — paste `lanjut ke halaman berikutnya` (or "continue") after each.
- If a page looks off, point Claude Code at the matching section: *"re-check screen 06 §② Squad"*.
- The Simulator is the largest file — let it finish that one in isolation, then build & smoke-test
  the full step flow (Setup → Squad → Simulate → Analytics).
- Want these rules to auto-load every Claude Code session? Say the word and I'll generate a
  `CLAUDE.md` you drop at the repo root.
