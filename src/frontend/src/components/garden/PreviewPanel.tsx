import type { GardenDesign } from "@/lib/garden-types";
import type { VarietyPublic } from "@/declarations/backend.did";
import {
  calculateYieldLocally,
  validateGardenLocally,
  type ValidationWarning,
  type YieldEstimate,
} from "@/lib/garden-rules";
import { GrowthPreview } from "./GrowthPreview";
import { SunlightSimulation } from "./SunlightSimulation";
import { ValidationPanel } from "./ValidationPanel";
import { YieldEstimator } from "./YieldEstimator";

type Props = {
  design: GardenDesign;
  varieties: VarietyPublic[];
  growthStage: number;
  onGrowthStageChange: (v: number) => void;
  sunLat: number;
  sunLng: number;
  onSunCoordsChange: (lat: number, lng: number) => void;
};

export function PreviewPanel({
  design,
  varieties,
  growthStage,
  onGrowthStageChange,
  sunLat,
  sunLng,
  onSunCoordsChange,
}: Props) {
  const warnings: ValidationWarning[] = validateGardenLocally(design, varieties);
  const yieldEst: YieldEstimate = calculateYieldLocally(design, varieties);

  return (
    <aside className="hidden xl:flex w-80 shrink-0 flex-col gap-3 border-l border-border bg-card/30 p-3 overflow-auto">
      <h2 className="text-sm font-semibold text-primary">Play Preview</h2>
      <GrowthPreview growthStage={growthStage} onChange={onGrowthStageChange} />
      <SunlightSimulation lat={sunLat} lng={sunLng} onCoordsChange={onSunCoordsChange} />
      <YieldEstimator estimate={yieldEst} />
      <ValidationPanel warnings={warnings} />
    </aside>
  );
}
