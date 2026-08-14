import { useQuery } from "@tanstack/react-query";
import { fetchWeatherSourceLedger } from "@/lib/weather-service";

function formatWhen(ns: number): string {
  try {
    return new Date(ns / 1_000_000).toLocaleString();
  } catch {
    return "—";
  }
}

export function WeatherSourceLedgerPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["weatherSourceLedger"],
    queryFn: () => fetchWeatherSourceLedger(12),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <p className="text-sm text-white/50">Loading source ledger…</p>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-sm text-white/50">
        No weather source fetches recorded yet. Ledger fills after the next outlook or tropical refresh.
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {data
        .slice()
        .reverse()
        .map((row) => (
          <li
            key={row.id}
            className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-white/80"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="uppercase tracking-wider text-[var(--wd-citrus)]">{row.kind}</span>
              <span className="text-white/40">{row.status}</span>
              <span className="text-white/40">{formatWhen(row.fetchedAt)}</span>
            </div>
            <p className="mt-1 truncate text-white/60" title={row.sourceUrl}>
              {row.sourceUrl}
            </p>
            <p className="mt-1 text-white/40">
              digest {row.bodyDigest.slice(0, 16)}… · parser {row.parserVersion}
              {row.gridKey ? ` · ${row.gridKey}` : ""}
            </p>
          </li>
        ))}
    </ul>
  );
}
