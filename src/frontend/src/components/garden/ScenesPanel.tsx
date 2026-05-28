import { Button } from "@/components/ui/button";
import type { CameraPresetId, GardenScene } from "@/lib/garden-types";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  scenes: GardenScene[];
  cameraPreset: CameraPresetId;
  onAdd: (name: string, preset: CameraPresetId) => void;
  onGo: (preset: CameraPresetId) => void;
  onRemove: (id: string) => void;
};

export function ScenesPanel({ scenes, cameraPreset, onAdd, onGo, onRemove }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/80 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Scenes</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => onAdd(`View ${scenes.length + 1}`, cameraPreset)}
        >
          <Plus className="h-3 w-3 mr-1" /> Add view
        </Button>
      </div>
      <ul className="space-y-1">
        {scenes.length === 0 && <li className="text-muted-foreground">Save camera positions for quick jumps.</li>}
        {scenes.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 text-left rounded px-2 py-1 hover:bg-white/10"
              onClick={() => onGo(s.preset)}
            >
              [{i + 1}] {s.name}
            </button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove(s.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
