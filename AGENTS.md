<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

TruthScout is a single Next.js 16 app (App Router). Standard commands live in `README.md`/`package.json`: `npm run dev` (port 3000), `npm run build`, `npm run lint`. Dependencies are refreshed automatically by the startup `npm install`.

### Backend requirement (non-obvious)
All API routes talk to Supabase via the service-role client, and `lib/env.ts` validates the three Supabase vars **eagerly at dev runtime** — `npm run dev` throws immediately without them (`npm run build` uses placeholders and does not). The repo ships **no** DB migrations/seed (the hosted DB is assumed to already contain `profiles`/`posts`/`votes` with data). So you must point the app at a Supabase backend, set in `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional keys (`VULTR_*`, `GRADIUM_*`) fail soft when unset — Vultr classification falls back to a local heuristic, and the TTS "Listen" button hides.

### Running Supabase locally (fallback used when no hosted secrets)
A local Supabase stack was set up outside the repo at `/home/ubuntu/ts-supabase` (schema migration + seed). To bring it back up: ensure the Docker daemon is running (`sudo dockerd`; on Docker 29 it needs `/etc/docker/daemon.json` with `storage-driver: fuse-overlayfs` and `features.containerd-snapshotter: false`, plus iptables-legacy), then `cd /home/ubuntu/ts-supabase && sudo supabase start`. Copy the printed `ANON_KEY`/`SERVICE_ROLE_KEY` (from `sudo supabase status -o env`) and API URL into `/workspace/.env.local`. Restart `npm run dev` after changing env — Next does not hot-reload `.env.local`. Two seed gotchas if you recreate the DB: (1) seeded `posts`/`profiles`/`votes` IDs must be valid RFC-9562 v4 UUIDs (zod `z.uuid()` in the routes rejects e.g. all-`a` UUIDs), and (2) the migration must `grant ... to service_role` or REST returns `permission denied`.

### Hello-world sanity check
No login — each browser auto-registers a demo profile. On the feed (`/`), click True/Partial/False on a FACTUAL post; the trust badge % and vote count update and the buttons lock into the voted state.
