import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { GROWTH_STAGES } from "@/lib/garden-rules";

type Props = {
  growthStage: number;
  onChange: (value: number) => void;
};

export function GrowthPreview({ growthStage, onChange }: Props) {
  const stage =
    GROWTH_STAGES.find((s) => s.value === growthStage) ??
    GROWTH_STAGES.reduce((prev, cur) =>
      Math.abs(cur.value - growthStage) < Math.abs(prev.value - growthStage) ? cur : prev,
    );

  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label>Growth stage</Label>
        <span className="text-sm">
          {stage.emoji} {stage.label}
        </span>
      </div>
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={[growthStage]}
        onValueChange={([v]) => onChange(v)}
      />
      <p className="text-xs text-muted-foreground">
        Scrub through the season — procedural plants scale with growth stage.
      </p>
    </div>
  );
}
