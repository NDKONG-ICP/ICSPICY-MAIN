import { Badge } from "@/components/ui/badge";
import type { YieldEstimate } from "@/lib/garden-rules";
import { Scale } from "lucide-react";

type Props = {
  estimate: YieldEstimate;
};

export function YieldEstimator({ estimate }: Props) {
  const fmt = (n: number) => n.toFixed(1);

  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Yield estimate</h3>
      </div>
      {estimate.totalPlantCount === 0 ? (
        <p className="text-xs text-muted-foreground">{estimate.notes}</p>
      ) : (
        <>
          <p className="text-lg font-bold text-primary">
            {fmt(estimate.estimatedLbsMin)}–{fmt(estimate.estimatedLbsMax)} lbs
          </p>
          <p className="text-xs text-muted-foreground">
            {estimate.totalPlantCount} plant
            {estimate.totalPlantCount !== 1 ? "s" : ""} · {estimate.notes}
          </p>
          <div className="flex flex-wrap gap-1">
            {estimate.companionBonusPct > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{estimate.companionBonusPct.toFixed(0)}% companions
              </Badge>
            )}
            {estimate.spacingPenaltyPct > 0 && (
              <Badge variant="outline" className="text-xs">
                −{estimate.spacingPenaltyPct.toFixed(0)}% spacing
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
