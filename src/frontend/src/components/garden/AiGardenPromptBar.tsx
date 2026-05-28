import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESET_PROMPTS, generateGardenLayout, layoutToDesign, surprisePrompt } from "@/lib/garden-ai";
import { Sparkles, Shuffle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  plotWidth: number;
  plotDepth: number;
  zone: string;
  generating: boolean;
  onGenerate: (design: ReturnType<typeof layoutToDesign>, explanation: string, prompt: string) => void;
  onGeneratingChange: (v: boolean) => void;
};

export function AiGardenPromptBar({
  plotWidth,
  plotDepth,
  zone,
  generating,
  onGenerate,
  onGeneratingChange,
}: Props) {
  const [prompt, setPrompt] = useState("");

  const run = async (text: string) => {
    if (!text.trim() || generating) return;
    onGeneratingChange(true);
    try {
      const layout = await generateGardenLayout(text, plotWidth, plotDepth, zone);
      onGenerate(layoutToDesign(layout), layout.explanation, text);
    } finally {
      onGeneratingChange(false);
    }
  };

  return (
    <div className="border-b border-white/10 bg-gradient-to-r from-orange-950/40 via-card/80 to-card/80 backdrop-blur-xl px-3 py-3 space-y-2">
      <div className="flex gap-2 items-center">
        <span className="text-lg shrink-0">🤖</span>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Design me a 20×30 food forest for Zone 10a with tropical fruits, peppers, and a chicken coop…'
          className="flex-1 bg-white/5 border-white/10"
          onKeyDown={(e) => {
            if (e.key === "Enter") void run(prompt);
          }}
          disabled={generating}
        />
        <Button onClick={() => void run(prompt)} disabled={generating || !prompt.trim()}>
          <Sparkles className="h-4 w-4 mr-1" />
          {generating ? "Designing…" : "Generate"}
        </Button>
        <Button variant="outline" className="border-white/10" onClick={() => void run(surprisePrompt())} disabled={generating}>
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>
      {generating && (
        <p className="text-xs text-primary animate-pulse">🤖 Designing your garden… this may take 5–15 seconds</p>
      )}
      <div className="flex flex-wrap gap-1">
        {PRESET_PROMPTS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={generating}
            onClick={() => {
              setPrompt(p.prompt);
              void run(p.prompt);
            }}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] border border-white/10 bg-white/5 hover:border-primary/40 transition-colors",
            )}
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
