import { Link } from "@tanstack/react-router";
import type { VarietyProvenancePublic } from "../../declarations/backend.did";
import type { GameVarietyDef } from "./varieties";

export function VarietyDetailCard({
  variety,
  catalogId,
  provenance,
}: {
  variety: GameVarietyDef;
  catalogId?: string;
  provenance?: VarietyProvenancePublic | null;
}) {
  const origin = provenance?.origin?.[0] ?? variety.origin;
  const breeder = provenance?.breeder?.[0] ?? variety.breeder;
  const heatClass = provenance?.heatClass?.[0];
  const guideTo = catalogId
    ? `/variety/${catalogId}/guide`
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-orange-200">{variety.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {variety.tier} · {variety.shuMin.toLocaleString()}–
            {variety.shuMax.toLocaleString()} SHU
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
          ICSPICY
        </span>
      </div>
      {origin && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="text-foreground/80">Origin:</span> {origin}
        </p>
      )}
      {breeder && (
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground/80">Breeder:</span> {breeder}
        </p>
      )}
      {heatClass && (
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground/80">Heat class:</span> {heatClass}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Growth ~{Math.round(variety.growthTimeMs / 60_000)} min · Care sensitivity{" "}
        {Math.round(variety.careSensitivity * 100)}%
      </p>
      {guideTo && (
        <Link
          to="/variety/$varietyId/guide"
          params={{ varietyId: catalogId! }}
          className="mt-2 inline-block text-xs font-medium text-emerald-400 hover:underline"
        >
          Learn to grow it for real →
        </Link>
      )}
    </div>
  );
}
