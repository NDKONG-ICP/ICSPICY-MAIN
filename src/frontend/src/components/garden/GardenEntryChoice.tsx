import type { GardenDesign } from "@/lib/garden-types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type EntryIntent = "blank" | "ai" | "satellite";

type Props = {
  open: boolean;
  savedDesigns: GardenDesign[];
  onChoose: (intent: EntryIntent) => void;
  onLoadDesign: (design: GardenDesign) => void;
};

const CHOICES: {
  intent: EntryIntent;
  emoji: string;
  title: string;
  subtitle: string;
}[] = [
  {
    intent: "blank",
    emoji: "📐",
    title: "Blank Plot",
    subtitle: "Start from scratch",
  },
  {
    intent: "ai",
    emoji: "🤖",
    title: "AI Generate",
    subtitle: "Describe your dream garden",
  },
  {
    intent: "satellite",
    emoji: "🛰️",
    title: "My Yard (Satellite)",
    subtitle: "Design on real satellite imagery",
  },
];

/**
 * Full-screen entry choice shown when /garden opens with no design loaded.
 * Big tap targets, one-handed friendly on mobile.
 */
export function GardenEntryChoice({
  open,
  savedDesigns,
  onChoose,
  onLoadDesign,
}: Props) {
  const [savedOpen, setSavedOpen] = useState(false);

  if (!open) return null;

  return (
    <div className="garden-designer absolute inset-0 z-[55] flex items-center justify-center overflow-y-auto bg-[color:var(--garden-bg,#0d0d10)]/97 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-5 py-8">
        <div className="text-center">
          <div className="text-4xl">🌱</div>
          <h1 className="garden-font-display mt-2 text-2xl font-bold text-white">
            Garden Designer
          </h1>
          <p className="mt-1 text-sm text-[color:var(--garden-text-muted,#9a9aa5)]">
            Design your dream garden
          </p>
        </div>

        <div className="space-y-3">
          {CHOICES.map((c) => (
            <button
              key={c.intent}
              type="button"
              onClick={() => onChoose(c.intent)}
              className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-red-500/50 hover:bg-red-500/10 active:scale-[0.99]"
              style={{ minHeight: 72 }}
            >
              <span className="text-3xl">{c.emoji}</span>
              <span>
                <span className="block font-semibold text-white">
                  {c.title}
                </span>
                <span className="block text-xs text-[color:var(--garden-text-muted,#9a9aa5)]">
                  {c.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>

        {savedDesigns.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setSavedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-[color:var(--garden-text-muted,#9a9aa5)] hover:text-white"
            >
              Open a saved design
              <ChevronDown
                className={`h-4 w-4 transition-transform ${savedOpen ? "rotate-180" : ""}`}
              />
            </button>
            {savedOpen && (
              <div className="max-h-52 overflow-y-auto border-t border-white/10">
                {savedDesigns.map((d) => (
                  <button
                    key={d.id ?? d.name}
                    type="button"
                    onClick={() => onLoadDesign(d)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white hover:bg-white/5"
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-[color:var(--garden-text-muted,#9a9aa5)]">
                      {d.plants.length} plants
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
