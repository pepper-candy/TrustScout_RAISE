import { Feed } from "@/components/features/feed";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,1))] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-700">
            TruthScout MVP
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                Making truth visible, one swipe at a time.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Review seeded posts, vote True / Partial / False, and watch the weighted trust score
                recalculate through the Next.js application layer.
              </p>
            </div>
            <div className="rounded-3xl bg-foreground p-5 text-background">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-70">
                P0 baseline
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium">
                <li>Feed display</li>
                <li>3-way vote submission</li>
                <li>Weighted trust-score persistence</li>
              </ul>
            </div>
          </div>
        </section>

        <Feed />
      </div>
    </main>
  );
}
