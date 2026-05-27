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
import type { CameraPresetId, DesignerMode } from "@/lib/garden-types";
import type { GardenDesignerState } from "@/hooks/useGardenDesigner";
import type { YieldEstimate } from "@/lib/garden-rules";
import { plantSummary } from "@/lib/garden-utils";
import {
  Bird,
  Box,
  Camera,
  Eye,
  FileImage,
  Layers,
  MapPin,
  Redo2,
  Save,
  Settings2,
  Share2,
  Undo2,
  Upload,
  Play,
  User,
  Mountain,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  designer: GardenDesignerState;
  mode: DesignerMode;
  onModeChange: (m: DesignerMode) => void;
  onLoadClick: () => void;
  isAuthenticated: boolean;
  previewOpen?: boolean;
  onPreviewToggle?: () => void;
  cameraPreset?: CameraPresetId;
  onCameraPreset?: (p: CameraPresetId) => void;
  yieldEstimate?: YieldEstimate;
  locationLabel?: string | null;
  onLocationClick?: () => void;
  timeOfDayHour?: number;
  onTimeOfDayChange?: (h: number) => void;
  onEnvironmentClick?: () => void;
  onScreenshot?: () => void;
  onExportSvg?: () => void;
};

const CAMERA_BUTTONS: { id: CameraPresetId; label: string; icon: typeof Box }[] = [
  { id: "sims", label: "Corner", icon: Box },
  { id: "top", label: "Top", icon: Layers },
  { id: "walk", label: "Walk", icon: User },
  { id: "bird", label: "Bird", icon: Bird },
];

export function DesignerToolbar({
  designer,
  mode,
  onModeChange,
  onLoadClick,
  isAuthenticated,
  previewOpen,
  onPreviewToggle,
  cameraPreset = "sims",
  onCameraPreset,
  yieldEstimate,
  locationLabel,
  onLocationClick,
  timeOfDayHour = 14,
  onTimeOfDayChange,
  onEnvironmentClick,
  onScreenshot,
  onExportSvg,
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
    <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2 space-y-2 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={design.name}
          onChange={(e) => setName(e.target.value)}
          disabled={readOnly}
          className="max-w-[200px] font-semibold bg-white/5 border-white/10"
        />
        <Select
          value={String(design.gridSizeMeters)}
          onValueChange={(v) => setGridSize(Number(v))}
          disabled={readOnly}
        >
          <SelectTrigger className="w-[100px] bg-white/5 border-white/10">
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
            className="w-16 bg-white/5 border-white/10"
            value={design.widthMeters}
            disabled={readOnly}
            onChange={(e) =>
              setPlotSize(Number(e.target.value), design.depthMeters)
            }
          />
          <span className="text-muted-foreground">×</span>
          <Input
            type="number"
            className="w-16 bg-white/5 border-white/10"
            value={design.depthMeters}
            disabled={readOnly}
            onChange={(e) =>
              setPlotSize(design.widthMeters, Number(e.target.value))
            }
          />
          <span className="text-muted-foreground text-xs">m</span>
        </div>
        <div className="flex rounded-md border border-white/10 overflow-hidden bg-white/5">
          <Button
            size="sm"
            variant={viewMode === "3d" ? "default" : "ghost"}
            className={cn("rounded-none", viewMode === "3d" && "shadow-[0_0_12px_rgba(249,115,22,0.35)]")}
            onClick={() => setViewMode("3d")}
          >
            <Box className="h-4 w-4 mr-1" /> 3D
          </Button>
          <Button
            size="sm"
            variant={viewMode === "2d" ? "default" : "ghost"}
            className={cn("rounded-none", viewMode === "2d" && "shadow-[0_0_12px_rgba(249,115,22,0.35)]")}
            onClick={() => setViewMode("2d")}
          >
            <Layers className="h-4 w-4 mr-1" /> 2D
          </Button>
        </div>
        {viewMode === "3d" && onCameraPreset && (
          <div className="hidden md:flex rounded-md border border-white/10 overflow-hidden bg-white/5">
            {CAMERA_BUTTONS.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                size="sm"
                variant={cameraPreset === id ? "default" : "ghost"}
                className={cn(
                  "rounded-none text-xs px-2",
                  cameraPreset === id && "shadow-[0_0_10px_rgba(249,115,22,0.3)]",
                )}
                onClick={() => onCameraPreset(id)}
                title={label}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
        )}
        {!readOnly && (
          <>
            <Button size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={undo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={redo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </>
        )}
        <div className="flex rounded-md border border-white/10 overflow-hidden ml-auto bg-white/5">
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
            <Button size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={onLoadClick}>
              <Upload className="h-4 w-4 mr-1" /> Load
            </Button>
          </>
        )}
        <Button size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={() => void share()}>
          <Share2 className="h-4 w-4 mr-1" /> Share
        </Button>
        {onPreviewToggle && (
          <Button
            size="sm"
            variant={previewOpen ? "default" : "outline"}
            className={cn(!previewOpen && "border-white/10 bg-white/5", previewOpen && "shadow-[0_0_12px_rgba(249,115,22,0.35)]")}
            onClick={onPreviewToggle}
          >
            <Play className="h-4 w-4 mr-1" /> Preview
          </Button>
        )}
        {onScreenshot && (
          <Button size="sm" variant="outline" className="border-white/10 bg-white/5 hidden md:inline-flex" onClick={onScreenshot}>
            <Camera className="h-4 w-4 mr-1" /> PNG
          </Button>
        )}
        {onExportSvg && (
          <Button size="sm" variant="outline" className="border-white/10 bg-white/5 hidden md:inline-flex" onClick={onExportSvg}>
            <FileImage className="h-4 w-4 mr-1" /> SVG
          </Button>
        )}
        {onEnvironmentClick && (
          <Button size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={onEnvironmentClick}>
            <Settings2 className="h-4 w-4 mr-1" /> Env
          </Button>
        )}
        {onLocationClick && (
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5"
            onClick={onLocationClick}
          >
            <MapPin className="h-4 w-4 mr-1" />
            {locationLabel ?? "Set location"}
          </Button>
        )}
        <label className="flex items-center gap-2 text-sm ml-1">
          <input
            type="checkbox"
            checked={design.isPublic}
            disabled={readOnly}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Public
        </label>
        <Badge variant="secondary" className="ml-auto bg-white/10 border-white/10">
          {plantSummary(design)}
        </Badge>
      </div>
      {onTimeOfDayChange && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
          <span>☀️</span>
          <input
            type="range"
            min={6}
            max={20}
            value={timeOfDayHour}
            onChange={(e) => onTimeOfDayChange(Number(e.target.value))}
            className="w-32 accent-primary"
          />
          <span className="tabular-nums w-14">{timeOfDayHour}:00</span>
        </div>
      )}
      {yieldEstimate && (
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
          <Mountain className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            <strong>{yieldEstimate.totalPlantCount}</strong> plants
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            Est. yield{" "}
            <strong>
              {yieldEstimate.estimatedLbsMin.toFixed(1)}–{yieldEstimate.estimatedLbsMax.toFixed(1)} lbs
            </strong>
          </span>
          {yieldEstimate.companionBonusPct > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-green-400">+{yieldEstimate.companionBonusPct}% companions</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
