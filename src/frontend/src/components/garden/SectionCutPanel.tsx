import { Button } from "@/components/ui/button";
import type { GardenDesign } from "@/lib/garden-types";
import { renderSectionProfile } from "./GardenProOverlays";

type Props = {
  design: GardenDesign;
  cutY: number | null;
  onCutYChange: (y: number | null) => void;
};

export function SectionCutPanel({ design, cutY, onCutYChange }: Props) {
  const profile = cutY != null ? renderSectionProfile(design, cutY) : [];
  return (
    <div className="rounded-xl border border-white/10 bg-card/80 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">✂️ Section Cut</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => onCutYChange(cutY == null ? design.depthMeters / 2 : null)}
        >
          {cutY == null ? "Place cut" : "Clear"}
        </Button>
      </div>
      {cutY != null && (
        <>
          <p className="text-muted-foreground">Cut at Y = {cutY.toFixed(1)}m</p>
          <div className="font-mono text-[10px] space-y-0.5 border-l-2 border-purple-500 pl-2">
            {profile.length === 0 ? (
              <p>No plants at this slice.</p>
            ) : (
              profile.map((p) => (
                <div key={p.label} style={{ marginLeft: `${Math.min(p.heightM * 4, 40)}px` }}>
                  {"▲".repeat(Math.max(1, Math.round(p.heightM)))} {p.label} ({p.heightM}m)
                </div>
              ))
            )}
            <p className="text-muted-foreground pt-1">════════════════ ground</p>
          </div>
        </>
      )}
    </div>
  );
}
