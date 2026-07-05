<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

TrustScout is a single Next.js 16 app (App Router). Standard commands live in `README.md`/`package.json`: `npm run dev` (port 3000), `npm run build`, `npm run lint`. Dependencies are refreshed automatically by the startup `npm install`.

### Backend (Supabase) — non-obvious
All API routes talk to Supabase via the service-role client. The three Supabase credentials are provided as **Cursor Secrets (injected env vars)** and point at the hosted project, which already contains `profiles`/`posts`/`votes` with seed data (the repo ships no migrations): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `lib/env.ts` validates the two `NEXT_PUBLIC_*` vars **eagerly at dev runtime**, so `npm run dev` throws immediately if they aren't in the dev server process's environment. Gotchas:
- The dev-server process must actually inherit those env vars. If you start it from a shell/tmux that predates the secrets (stale env), it 500s with "Invalid API key"/validation errors — start it from a shell that has them (or pass them through, e.g. `tmux new-session -e VAR=... `). No `.env.local` is needed when the secrets are in the environment; `.env.local` (gitignored) is only a manual override.
- `next build`/`next start`: `NEXT_PUBLIC_*` are inlined at **build time**, so the real URL/anon key must be present during `npm run build` (dev reads them at runtime and is fine). A build with them unset bakes a placeholder Supabase URL and the served app can't reach the DB.
- Optional keys (`VULTR_*`, `GRADIUM_*`) fail soft when unset — Vultr classification falls back to a local heuristic; the TTS "Listen" button hides.

### Local Supabase fallback (only if secrets are absent)
If no hosted secrets are available, a local stack can be run: `sudo dockerd` (Docker 29 needs `/etc/docker/daemon.json` with `storage-driver: fuse-overlayfs` + `features.containerd-snapshotter: false` and iptables-legacy), then `supabase init`/`supabase start` outside the repo, and set the printed URL/keys in `/workspace/.env.local`. If you author seed rows, note (1) IDs must be valid RFC-9562 v4 UUIDs (zod `z.uuid()` rejects e.g. all-`a` UUIDs) and (2) the migration must `grant ... to service_role` or REST returns `permission denied`.

### Hello-world sanity check
No login — each browser auto-registers a demo profile. On the feed (`/`), vote on a FACTUAL post by **swiping** it (right = True, left = False, down = Partial; hold ~500ms before swiping = Witness) or via the True/Partial/False buttons. Votes are re-submittable — voting again replaces the prior vote (`/api/votes` upserts) — and the trust badge % / vote count update live.
