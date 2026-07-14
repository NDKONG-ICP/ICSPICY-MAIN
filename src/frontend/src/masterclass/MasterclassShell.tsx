/**
 * Shared IC SPICY masterclass shell — games-hub visual language.
 */
import type { ReactNode } from "react";
import { Flame } from "lucide-react";

export const MC_CARD =
  "rounded-2xl border border-white/[0.08] bg-gradient-to-br from-zinc-950/70 to-black/50 backdrop-blur-md shadow-elevated";

export const MC_CARD_ACCENT =
  "rounded-2xl border border-orange-500/25 bg-gradient-to-br from-red-950/60 via-zinc-950/50 to-black/60 backdrop-blur-md";

export const MC_CARD_EMERALD =
  "rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/50 to-zinc-950/60 backdrop-blur-md";

export function MasterclassShell({
  children,
  badge,
  title,
  subtitle,
}: {
  children: ReactNode;
  badge?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-b from-black via-[#180303] to-[#2a0a00]"
      data-ocid="masterclass-shell"
    >
      <div className="pointer-events-none absolute inset-x-0 top-16 h-56 bg-[radial-gradient(ellipse_at_center,rgba(234,88,12,0.16),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_center,rgba(22,163,74,0.08),transparent_70%)]" />

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          {badge ? (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
              <Flame className="h-3.5 w-3.5" />
              {badge}
            </div>
          ) : null}
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
