import type { YieldEstimate } from "@/lib/garden-rules";
import { computeSmartData, m2ToFt2 } from "@/lib/garden-smart-data";
import type { GardenDesign } from "@/lib/garden-types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  design: GardenDesign;
  yieldEst: YieldEstimate;
  compact?: boolean;
};

function pct(n: number, total: number) {
  return total > 0 ? ((n / total) * 100).toFixed(1) : "0";
}

export function SmartDataPanel({ design, yieldEst, compact }: Props) {
  const [open, setOpen] = useState(!compact);
  const d = useMemo(
    () => computeSmartData(design, yieldEst),
    [design, yieldEst],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-card/80 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold hover:bg-white/5"
        onClick={() => setOpen((v) => !v)}
      >
        <span>📊 Smart Data</span>
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>
      {open && (
        <div
          className={cn(
            "px-3 pb-3 space-y-3 text-xs",
            compact && "max-h-48 overflow-auto",
          )}
        >
          <section>
            <p className="font-medium text-muted-foreground mb-1">
              Area Summary
            </p>
            <ul className="space-y-0.5">
              <li>
                Total plot: {d.totalPlotM2.toFixed(0)} m² (
                {m2ToFt2(d.totalPlotM2).toFixed(0)} ft²)
              </li>
              <li>
                Planted: {d.plantedAreaM2.toFixed(0)} m² (
                {pct(d.plantedAreaM2, d.totalPlotM2)}%)
              </li>
              <li>
                Hardscape: {d.hardscapeM2.toFixed(0)} m² (
                {pct(d.hardscapeM2, d.totalPlotM2)}%)
              </li>
              <li>
                Paths: {d.pathAreaM2.toFixed(0)} m² (
                {pct(d.pathAreaM2, d.totalPlotM2)}%)
              </li>
              <li>
                Open/lawn: {d.openAreaM2.toFixed(0)} m² (
                {pct(d.openAreaM2, d.totalPlotM2)}%)
              </li>
            </ul>
          </section>
          <section>
            <p className="font-medium text-muted-foreground mb-1">
              Plant Summary
            </p>
            <ul className="space-y-0.5">
              <li>
                Total: {d.totalPlants} · Trees {d.trees} | Shrubs {d.shrubs} |
                Herbs {d.herbs}
              </li>
              <li>
                Native: {d.nativeCount} ({d.nativePct.toFixed(0)}%)
                {d.nativePct < 50 && " — ⚠️ aim for 50%+"}
              </li>
              <li>
                Edible: {d.edibleCount} ({d.ediblePct.toFixed(0)}%)
              </li>
              <li>Pollinators: {d.pollinatorCount}</li>
              <li>
                Est. yield: {d.yieldMin.toFixed(0)}–{d.yieldMax.toFixed(0)} lbs
              </li>
            </ul>
          </section>
          <section>
            <p className="font-medium text-muted-foreground mb-1">
              Water Budget
            </p>
            <ul className="space-y-0.5">
              <li>Est. weekly: {d.weeklyWaterGal} gal</li>
              <li>
                Rain barrels: {d.rainBarrelGal} gal
                {d.rainBarrelGal > 0 &&
                  ` (covers ${Math.round((d.rainBarrelGal / d.weeklyWaterGal) * 100)}%)`}
              </li>
              <li>
                Drought-tolerant: {d.droughtTolerantCount} (
                {d.droughtPct.toFixed(0)}%)
              </li>
              <li>Irrigation coverage: {d.irrigationCoveragePct}%</li>
            </ul>
          </section>
          <section>
            <p className="font-medium text-muted-foreground mb-1">
              Sustainability: {d.sustainabilityScore}/100
            </p>
          </section>
          <section>
            <p className="font-medium text-muted-foreground mb-1">
              Cost Estimate
            </p>
            <p className="text-base font-bold">
              ${(d.costTotalCents / 100).toFixed(0)}
            </p>
            <p className="mt-2 text-center text-muted-foreground/70">
              🛒 Shop integration coming soon
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
