import { BookOpen, Leaf, UtensilsCrossed } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type DailyAlmanacData = {
  dateKey: string;
  publishedAt: number;
  title: string;
  body: string;
  recipeSlug?: string | null;
  varietyIds: number[];
};

export function WeatherDailyAlmanac({
  almanac,
}: {
  almanac: DailyAlmanacData | null;
}) {
  if (!almanac) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <BookOpen className="mx-auto size-8 text-[var(--wd-citrus)] opacity-60" />
        <p className="mt-3 font-display text-lg font-semibold text-white">
          Daily almanac
        </p>
        <p className="mt-1 text-sm text-[var(--wd-muted)]">
          The Weather Concierge publishes each morning — check back after the
          next on-chain update.
        </p>
      </div>
    );
  }

  const paragraphs = almanac.body.split(/\n\n+/).filter(Boolean);

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--wd-citrus)]/30 bg-gradient-to-br from-[#1a1510] to-[#0e0d0b]">
      <header className="border-b border-white/10 bg-[var(--wd-citrus)]/10 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--wd-citrus)]">
          IC SPICY Weather Concierge · {almanac.dateKey}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">
          {almanac.title}
        </h2>
      </header>
      <div className="space-y-4 px-5 py-6 text-[15px] leading-relaxed text-white/90">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <footer className="flex flex-wrap gap-3 border-t border-white/10 px-5 py-4">
        {almanac.recipeSlug && (
          <Link
            to="/cookbook/$slug"
            params={{ slug: almanac.recipeSlug }}
            className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            <UtensilsCrossed className="size-4" />
            Recipe of the day
          </Link>
        )}
        {almanac.varietyIds.slice(0, 3).map((id) => (
          <Link
            key={id}
            to="/variety/$varietyId/guide"
            params={{ varietyId: id.toString() }}
            className="inline-flex items-center gap-2 rounded-md bg-green-500/15 px-3 py-2 text-sm font-medium text-green-200 hover:bg-green-500/25"
          >
            <Leaf className="size-4" />
            Growing guide #{id}
          </Link>
        ))}
      </footer>
    </article>
  );
}
