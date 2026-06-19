# THE GAFFER

A real football analytics and prediction platform built with Next.js 14, TypeScript, Prisma, and Recharts.

## Features

- **Dashboard** — Overview of teams, matches, and predictions
- **Teams** — Browse all football clubs in the database
- **Matches** — View match results and upcoming fixtures
- **Predictions** — Rule-based AI predictions with probability bars
- **Leaderboard** — Live standings computed from match results
- **Custom Metrics** — Build and evaluate custom team performance formulas
- **Admin Sync** — Sync live data from football-data.org API

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Formula Engine:** expr-eval
- **Football Data:** football-data.org API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted)

### Installation

```bash
# Clone and install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Environment Variables

Edit `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/the_gaffer"
FOOTBALL_DATA_API_KEY="your_api_key_here"   # Optional — app works without it
```

Get a free API key at: https://www.football-data.org/

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (requires PostgreSQL)
npx prisma migrate dev --name init

# Seed fallback data
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### Development

```bash
npm run dev
```

Open http://localhost:3000

Production URL: https://the-gaffer.stei.cloud

### Without a Database

The app requires PostgreSQL to function. If you don't have one locally:
- Use [Neon](https://neon.tech) (free tier)
- Use [Supabase](https://supabase.com) (free tier)
- Use [Railway](https://railway.app)

### With API Key

If `FOOTBALL_DATA_API_KEY` is set, visit `/admin/sync` and click "Start Sync" to fetch live data.

Without an API key, the app uses seed data (15 Premier League teams, 23 matches).

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync` | Sync from football-data.org |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/teams` | All teams |
| GET | `/api/matches` | Matches (filterable) |
| GET | `/api/predictions` | All predictions |
| POST | `/api/predictions/generate` | Generate predictions |
| GET | `/api/leaderboard` | Standings table |
| GET | `/api/custom-metrics` | List metrics |
| POST | `/api/custom-metrics` | Create metric |
| GET | `/api/custom-metrics/[id]/results` | Evaluate metric |

## Prediction Engine

Rule-based predictions using:
- Recent form (last 5 matches, recency-weighted)
- Goals scored/conceded averages
- Win rate
- Home advantage factor (+15%)

## Custom Metric Formulas

Available variables:
- `goals_for`, `goals_against`, `goal_difference`
- `wins`, `draws`, `losses`
- `win_rate`, `matches_played`

Example: `(goals_for * 2) + goal_difference + (win_rate * 100)`
