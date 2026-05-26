import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DesignerMode } from "@/lib/garden-types";
import type { GardenDesignerState } from "@/hooks/useGardenDesigner";
import { plantSummary } from "@/lib/garden-utils";
import {
  Box,
  Eye,
  Layers,
  Redo2,
  Save,
  Share2,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  designer: GardenDesignerState;
  mode: DesignerMode;
  onModeChange: (m: DesignerMode) => void;
  onLoadClick: () => void;
  isAuthenticated: boolean;
};

export function DesignerToolbar({
  designer,
  mode,
  onModeChange,
  onLoadClick,
  isAuthenticated,
}: Props) {
  const {
    design,
    viewMode,
    setViewMode,
    setName,
    setPlotSize,
    setGridSize,
    setIsPublic,
    undo,
    redo,
    saveDesign,
    isDirty,
    isSaving,
    readOnly,
  } = designer;

  const share = async () => {
    if (design.id == null) {
      toast.message("Save your design before sharing.");
      return;
    }
    const url = `${window.location.origin}/garden?design=${design.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur px-3 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={design.name}
          onChange={(e) => setName(e.target.value)}
          disabled={readOnly}
          className="max-w-[200px] font-semibold"
        />
        <Select
          value={String(design.gridSizeMeters)}
          onValueChange={(v) => setGridSize(Number(v))}
          disabled={readOnly}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Grid" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5m</SelectItem>
            <SelectItem value="1">1m</SelectItem>
            <SelectItem value="2">2m</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-sm">
          <Input
            type="number"
            className="w-16"
            value={design.widthMeters}
            disabled={readOnly}
            onChange={(e) =>
              setPlotSize(Number(e.target.value), design.depthMeters)
            }
          />
          <span className="text-muted-foreground">×</span>
          <Input
            type="number"
            className="w-16"
            value={design.depthMeters}
            disabled={readOnly}
            onChange={(e) =>
              setPlotSize(design.widthMeters, Number(e.target.value))
            }
          />
          <span className="text-muted-foreground text-xs">m</span>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          <Button
            size="sm"
            variant={viewMode === "3d" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setViewMode("3d")}
          >
            <Box className="h-4 w-4 mr-1" /> 3D
          </Button>
          <Button
            size="sm"
            variant={viewMode === "2d" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setViewMode("2d")}
          >
            <Layers className="h-4 w-4 mr-1" /> 2D
          </Button>
        </div>
        {!readOnly && (
          <>
            <Button size="sm" variant="outline" onClick={undo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={redo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </>
        )}
        <div className="flex rounded-md border border-border overflow-hidden ml-auto">
          <Button
            size="sm"
            variant={mode === "edit" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => onModeChange("edit")}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={mode === "view" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => onModeChange("view")}
          >
            <Eye className="h-4 w-4 mr-1" /> Browse
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && isAuthenticated && (
          <>
            <Button size="sm" onClick={() => void saveDesign()} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving…" : isDirty ? "Save*" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={onLoadClick}>
              <Upload className="h-4 w-4 mr-1" /> Load
            </Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={() => void share()}>
          <Share2 className="h-4 w-4 mr-1" /> Share
        </Button>
        <label className="flex items-center gap-2 text-sm ml-2">
          <input
            type="checkbox"
            checked={design.isPublic}
            disabled={readOnly}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Public
        </label>
        <Badge variant="secondary" className="ml-auto">
          {plantSummary(design)}
        </Badge>
      </div>
    </div>
  );
}
