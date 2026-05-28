import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESET_PROMPTS, generateGardenLayout, layoutToDesign, surprisePrompt } from "@/lib/garden-ai";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  plotWidth: number;
  plotDepth: number;
  zone: string;
  generating: boolean;
  onGeneratingChange: (v: boolean) => void;
  onGenerate: (design: ReturnType<typeof layoutToDesign>, explanation: string, prompt: string) => void;
  onLocation: () => void;
  onPreview: () => void;
  onWalk: () => void;
  onSave: () => void;
  onShare: () => void;
  onScreenshot: () => void;
  onWeather: () => void;
  onEnvironment: () => void;
  onGallery: () => void;
  onExportSvg?: () => void;
  onNewPlot?: () => void;
  weatherOn: boolean;
  isAuthenticated: boolean;
};

export function MobileActionsSheet({
  open,
  onClose,
  plotWidth,
  plotDepth,
  zone,
  generating,
  onGeneratingChange,
  onGenerate,
  onLocation,
  onPreview,
  onWalk,
  onSave,
  onShare,
  onScreenshot,
  onWeather,
  onEnvironment,
  onGallery,
  onExportSvg,
  onNewPlot,
  weatherOn,
  isAuthenticated,
}: Props) {
  const [prompt, setPrompt] = useState("");

  const runAi = async (text: string) => {
    if (!text.trim() || generating) return;
    onGeneratingChange(true);
    try {
      const layout = await generateGardenLayout(text, plotWidth, plotDepth, zone);
      onGenerate(layoutToDesign(layout), layout.explanation, text);
      onClose();
    } finally {
      onGeneratingChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="sm:hidden fixed inset-0 z-[70]">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close menu" />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-2xl border border-white/10 bg-card p-4 pb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Garden actions</h3>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3 mb-4">
          <p className="text-xs text-muted-foreground">🤖 AI Generate</p>
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dream garden…"
              className="flex-1"
              disabled={generating}
            />
            <Button disabled={generating || !prompt.trim()} onClick={() => void runAi(prompt)}>
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {PRESET_PROMPTS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={generating}
                onClick={() => void runAi(p.prompt)}
                className="rounded-full px-2 py-0.5 text-[10px] border border-white/10 bg-white/5"
              >
                {p.emoji} {p.label}
              </button>
            ))}
            <button
              type="button"
              disabled={generating}
              onClick={() => void runAi(surprisePrompt())}
              className="rounded-full px-2 py-0.5 text-[10px] border border-white/10 bg-white/5"
            >
              🎲 Surprise
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Button variant="outline" className="justify-start" onClick={() => { onLocation(); onClose(); }}>
            📍 Set Location
          </Button>
          {onNewPlot && (
            <Button variant="outline" className="justify-start" onClick={() => { onNewPlot(); onClose(); }}>
              📐 New blank plot
            </Button>
          )}
          <Button variant="outline" className="justify-start" onClick={() => { onPreview(); onClose(); }}>
            ▶ Preview
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => { onWalk(); onClose(); }}>
            🚶 Walk
          </Button>
          {isAuthenticated && (
            <Button variant="outline" className="justify-start" onClick={() => { onSave(); onClose(); }}>
              💾 Save
            </Button>
          )}
          <Button variant="outline" className="justify-start" onClick={() => { onShare(); onClose(); }}>
            📤 Share
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => { onScreenshot(); onClose(); }}>
            🖼️ Export PNG
          </Button>
          {onExportSvg && (
            <Button variant="outline" className="justify-start" onClick={() => { onExportSvg(); onClose(); }}>
              📐 Export SVG
            </Button>
          )}
          <Button
            variant={weatherOn ? "default" : "outline"}
            className="justify-start"
            onClick={() => { onWeather(); onClose(); }}
          >
            🌤️ Live Weather
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => { onEnvironment(); onClose(); }}>
            ⚙️ Environment
          </Button>
          <Button variant="outline" className={cn("justify-start col-span-2")} onClick={() => { onGallery(); onClose(); }}>
            🌿 Community Gallery
          </Button>
        </div>
      </div>
    </div>
  );
}
