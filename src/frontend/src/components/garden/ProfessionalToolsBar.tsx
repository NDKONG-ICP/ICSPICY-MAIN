import { Button } from "@/components/ui/button";
import type { GardenToolExtras } from "@/lib/garden-types";
import { cn } from "@/lib/utils";
import { Camera, Droplets, MessageSquare, Ruler, Scissors, Square } from "lucide-react";

type Props = {
  activeTool: GardenToolExtras["activeTool"];
  onTool: (t: GardenToolExtras["activeTool"]) => void;
  onPhotoUpload: () => void;
  className?: string;
};

const TOOLS: { id: GardenToolExtras["activeTool"]; label: string; icon: typeof Ruler }[] = [
  { id: "measure", label: "Measure", icon: Ruler },
  { id: "area", label: "Area", icon: Square },
  { id: "note", label: "Note", icon: MessageSquare },
  { id: "irrigation", label: "Irrigation", icon: Droplets },
  { id: "section", label: "Section", icon: Scissors },
];

export function ProfessionalToolsBar({ activeTool, onTool, onPhotoUpload, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          size="sm"
          variant={activeTool === id ? "default" : "outline"}
          className={cn("h-8 text-xs border-white/10", activeTool === id && "shadow-[0_0_10px_rgba(249,115,22,0.3)]")}
          onClick={() => onTool(activeTool === id ? "none" : id)}
        >
          <Icon className="h-3.5 w-3.5 mr-1" />
          {label}
        </Button>
      ))}
      <Button type="button" size="sm" variant="outline" className="h-8 text-xs border-white/10" onClick={onPhotoUpload}>
        <Camera className="h-3.5 w-3.5 mr-1" />
        Site photo
      </Button>
    </div>
  );
}
