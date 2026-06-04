import type { YieldEstimate } from "@/lib/garden-rules";
import type { GardenDesign } from "@/lib/garden-types";

type Props = {
  design: GardenDesign;
  yieldEstimate?: YieldEstimate;
  cursor?: { x: number; y: number } | null;
  zoom?: number;
  lastSaved?: string | null;
};

export function DesignerStatusBar({
  design,
  yieldEstimate,
  cursor,
  zoom = 100,
  lastSaved,
}: Props) {
  const beds = design.structures.filter((s) =>
    s.structureType.includes("bed"),
  ).length;

  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        <strong className="text-foreground">{design.plants.length}</strong>{" "}
        plants
        {beds > 0 && (
          <>
            {" "}
            · <strong className="text-foreground">{beds}</strong> beds
          </>
        )}
        {yieldEstimate && yieldEstimate.totalPlantCount > 0 && (
          <>
            {" "}
            · Est. yield{" "}
            <strong className="text-foreground">
              {yieldEstimate.estimatedLbsMin.toFixed(0)}–
              {yieldEstimate.estimatedLbsMax.toFixed(0)} lbs
            </strong>
          </>
        )}
      </span>
      {cursor && (
        <span className="hidden sm:inline">
          Cursor: ({cursor.x.toFixed(1)}m, {cursor.y.toFixed(1)}m)
        </span>
      )}
      <span className="ml-auto flex gap-3">
        {lastSaved && <span>{lastSaved}</span>}
        <span>Zoom: {zoom}%</span>
      </span>
    </footer>
  );
}
