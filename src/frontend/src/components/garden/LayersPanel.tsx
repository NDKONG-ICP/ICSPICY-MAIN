import type { LayerVisibility } from "@/lib/garden-types";
import { Eye, EyeOff } from "lucide-react";

const LAYER_META: { key: keyof LayerVisibility; label: string; emoji: string }[] = [
  { key: "plants", label: "Plants", emoji: "🌱" },
  { key: "structures", label: "Structures", emoji: "🏗️" },
  { key: "grid", label: "Grid", emoji: "⊞" },
  { key: "labels", label: "Labels / Names", emoji: "🏷️" },
  { key: "spacing", label: "Spacing Circles", emoji: "⭕" },
  { key: "companions", label: "Companion Lines", emoji: "🔗" },
  { key: "sunShade", label: "Sun/Shade Map", emoji: "☀️" },
  { key: "irrigation", label: "Irrigation Lines", emoji: "💧" },
  { key: "dimensions", label: "Dimensions", emoji: "📏" },
  { key: "satellite", label: "Satellite Imagery", emoji: "🛰️" },
  { key: "annotations", label: "Notes", emoji: "📝" },
  { key: "contours", label: "Terrain Contours", emoji: "〰️" },
  { key: "shadows", label: "Shadows (3D)", emoji: "🌑" },
];

type Props = {
  layers: LayerVisibility;
  onChange: (l: LayerVisibility) => void;
  compact?: boolean;
};

export function LayersPanel({ layers, onChange, compact }: Props) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {LAYER_META.map(({ key, label, emoji }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange({ ...layers, [key]: !layers[key] })}
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left text-sm hover:border-primary/40"
        >
          {layers[key] ? (
            <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span>{emoji}</span>
          <span className={layers[key] ? "" : "text-muted-foreground line-through"}>{label}</span>
        </button>
      ))}
    </div>
  );
}
