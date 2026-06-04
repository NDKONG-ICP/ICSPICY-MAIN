import { Button } from "@/components/ui/button";
import {
  DEFAULT_SATELLITE_ZOOM,
  MAX_SATELLITE_ZOOM,
  MIN_SATELLITE_ZOOM,
  clampSatelliteZoom,
} from "@/lib/satellite-tiles";
import { Minus, Plus } from "lucide-react";
import { useCallback, useRef } from "react";

type Props = {
  zoom: number;
  onZoomChange: (z: number) => void;
  visible?: boolean;
};

export function SatelliteZoomControls({
  zoom,
  onZoomChange,
  visible = true,
}: Props) {
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = useCallback(
    (delta: number) => {
      onZoomChange(clampSatelliteZoom(zoom + delta));
    },
    [onZoomChange, zoom],
  );

  const startRepeat = (delta: number) => {
    step(delta);
    repeatRef.current = setInterval(() => step(delta), 120);
  };

  const stopRepeat = () => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  };

  if (!visible) return null;

  return (
    <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-2 rounded-lg border border-white/10 bg-black/70 backdrop-blur px-2 py-2 text-white text-xs shadow-lg sm:flex-row sm:items-center sm:gap-1">
      <span className="hidden sm:inline text-zinc-400 mr-1 shrink-0">
        Satellite
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-white hover:bg-white/10"
          disabled={zoom <= MIN_SATELLITE_ZOOM}
          onMouseDown={() => startRepeat(-1)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={() => startRepeat(-1)}
          onTouchEnd={stopRepeat}
          aria-label="Zoom out satellite"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="tabular-nums w-6 text-center font-medium">{zoom}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-white hover:bg-white/10"
          disabled={zoom >= MAX_SATELLITE_ZOOM}
          onMouseDown={() => startRepeat(1)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={() => startRepeat(1)}
          onTouchEnd={stopRepeat}
          aria-label="Zoom in satellite"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <input
        type="range"
        min={MIN_SATELLITE_ZOOM}
        max={MAX_SATELLITE_ZOOM}
        step={1}
        value={zoom}
        onChange={(e) =>
          onZoomChange(clampSatelliteZoom(Number(e.target.value)))
        }
        className="w-full sm:w-24 accent-primary"
        aria-label="Satellite zoom level"
      />
      {zoom !== DEFAULT_SATELLITE_ZOOM && (
        <button
          type="button"
          className="text-[10px] text-primary hover:underline shrink-0"
          onClick={() => onZoomChange(DEFAULT_SATELLITE_ZOOM)}
        >
          Reset
        </button>
      )}
    </div>
  );
}
