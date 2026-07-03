import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m2ToFt2 } from "@/lib/garden-smart-data";
import { clampPlot } from "@/lib/garden-utils";
import { useEffect, useState } from "react";

export type NewPlotConfig = {
  name: string;
  widthMeters: number;
  depthMeters: number;
  ground: "blank" | "satellite";
};

type Props = {
  open: boolean;
  onConfirm: (config: NewPlotConfig) => void;
  onOpenChange?: (open: boolean) => void;
  initialName?: string;
  initialWidth?: number;
  initialDepth?: number;
  initialGround?: "blank" | "satellite";
};

export function NewGardenPlotDialog({
  open,
  onConfirm,
  onOpenChange,
  initialName = "My Garden",
  initialWidth = 10,
  initialDepth = 10,
  initialGround = "blank",
}: Props) {
  const [name, setName] = useState(initialName);
  const [width, setWidth] = useState(String(initialWidth));
  const [depth, setDepth] = useState(String(initialDepth));
  const [ground, setGround] = useState<"blank" | "satellite">(initialGround);
  const [unit, setUnit] = useState<"m" | "ft">("m");

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setWidth(String(initialWidth));
    setDepth(String(initialDepth));
    setGround(initialGround);
  }, [open, initialDepth, initialName, initialWidth, initialGround]);

  const widthM =
    unit === "m"
      ? clampPlot(Number(width) || 10)
      : clampPlot((Number(width) || 32) / 3.28084);
  const depthM =
    unit === "m"
      ? clampPlot(Number(depth) || 10)
      : clampPlot((Number(depth) || 32) / 3.28084);

  const submit = () => {
    onConfirm({
      name: name.trim() || "My Garden",
      widthMeters: widthM,
      depthMeters: depthM,
      ground,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Start a new garden plot</DialogTitle>
          <DialogDescription>
            Enter your plot size and choose a ground type. You can add plants
            and structures on a blank canvas, or align satellite imagery to your
            property.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plot-name">Design name</Label>
            <Input
              id="plot-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Garden"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={unit === "m" ? "default" : "outline"}
              onClick={() => setUnit("m")}
            >
              Meters
            </Button>
            <Button
              type="button"
              size="sm"
              variant={unit === "ft" ? "default" : "outline"}
              onClick={() => setUnit("ft")}
            >
              Feet
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plot-width">Width ({unit})</Label>
              <Input
                id="plot-width"
                type="number"
                min={unit === "m" ? 2 : 6}
                max={unit === "m" ? 100 : 328}
                step={unit === "m" ? 0.5 : 1}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plot-depth">Depth ({unit})</Label>
              <Input
                id="plot-depth"
                type="number"
                min={unit === "m" ? 2 : 6}
                max={unit === "m" ? 100 : 328}
                step={unit === "m" ? 0.5 : 1}
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Plot area: {widthM.toFixed(1)} × {depthM.toFixed(1)} m (
            {m2ToFt2(widthM * depthM).toFixed(0)} ft²)
          </p>

          <div className="space-y-2">
            <Label>Ground</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setGround("blank")}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  ground === "blank"
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="font-medium">🌱 Blank plot</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Plain ground — design from scratch, no satellite.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setGround("satellite")}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  ground === "satellite"
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="font-medium">🛰️ Satellite</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Position your plot on aerial imagery after sizing.
                </p>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit}>
            Start designing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
