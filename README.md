# TrustScout

A crowdsourced truth verification layer for social media content, built for RAISE Hackathon 2026. Users vote **True / Partial / False** on posts; a reputation-weighted consensus algorithm produces a color-coded trust score. See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the full product spec.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (Postgres) — all reads/writes go through Route Handlers using the service-role client; the anon key has no table grants by design
- **Vultr Serverless Inference** — post classification (FACTUAL / OPINION / DEBATE) and text embeddings
- **Gradium** — text-to-speech for reading a post's trust summary aloud

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No login is required — each browser is assigned a random demo user (see `lib/auth.ts`) so weighted voting can be demonstrated across different reputations.

## Environment Variables

Copy `.env.local` (already provided for the hackathon) or set:

| Variable | Required | Purpose |
|:---|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase project (browser client, no table grants) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase client used by all API routes |
| `VULTR_API_KEY` / `VULTR_INFERENCE_URL` | No | Post classification + embeddings; falls back to a local heuristic if unset |
| `GRADIUM_API_KEY` | No | Text-to-speech "Listen" button; the button is hidden if unset |

## Project Structure

```
app/api/          Route Handlers (posts, votes, profile, classify, tts) — the only code allowed to talk to Supabase
components/ui/    shadcn primitives
components/features/  App-specific components (post card, header, trust badge, bottom nav)
lib/services/     Third-party API wrappers (Vultr, Gradium)
lib/              Auth, env validation, trust-score math
types/database.ts Hand-written types mirroring the Supabase schema
```

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build (also runs the TypeScript check)
npm run lint    # eslint
```
