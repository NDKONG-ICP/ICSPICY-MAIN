import type { GardenDesign } from "@/lib/garden-types";
import { generateProjectTimeline } from "@/lib/garden-smart-data";

type Props = {
  design: GardenDesign;
};

export function TimelinePanel({ design }: Props) {
  const lines = generateProjectTimeline(design);
  return (
    <div className="rounded-xl border border-white/10 bg-card/80 p-3 text-xs space-y-2 max-h-48 overflow-auto">
      <p className="font-semibold">Project Timeline</p>
      <ul className="space-y-1.5">
        {lines.map((line) => (
          <li key={line} className="text-muted-foreground leading-snug">
            • {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
