import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MONTH_LABELS } from "@/lib/garden-seasonal";
import { Play, Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  month: number;
  onMonthChange: (m: number) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function SeasonalGrowthPanel({ month, onMonthChange, open, onOpenChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const monthRef = useRef(month);
  monthRef.current = month;

  useEffect(() => {
    if (!playing) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      const m = monthRef.current;
      onMonthChange(m >= 12 ? 1 : m + 1);
    }, 1200);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, onMonthChange]);

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="border-white/10" onClick={() => onOpenChange(true)}>
        <Play className="h-4 w-4 mr-1" /> Growth Sim
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-card/90 backdrop-blur p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Seasonal growth — {MONTH_LABELS[month - 1]}</span>
        <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
      </div>
      <Slider value={[month]} min={1} max={12} step={1} onValueChange={([v]) => onMonthChange(v ?? 1)} />
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        {MONTH_LABELS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>
        {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
        {playing ? "Pause" : "Play year"}
      </Button>
    </div>
  );
}
