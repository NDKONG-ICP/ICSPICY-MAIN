import { Button } from "@/components/ui/button";
import type { CompanionSuggestion } from "@/lib/garden-companions";
import { AlertTriangle, Sprout } from "lucide-react";

type Props = {
  suggestions: CompanionSuggestion[];
  onAdd: (catalogId: string) => void;
  onDismiss: () => void;
};

export function CompanionSuggestions({ suggestions, onAdd, onDismiss }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute left-1/2 bottom-20 z-30 -translate-x-1/2 w-[min(420px,92vw)] rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl p-3 shadow-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-1">
          <Sprout className="h-4 w-4 text-primary" /> Companion suggestions
        </span>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
      <ul className="space-y-2 max-h-40 overflow-auto">
        {suggestions.map((s) => (
          <li
            key={`${s.type}-${s.plant.id}`}
            className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs"
          >
            {s.type === "warning" ? (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <span className="text-base">{s.plant.iconEmoji}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{s.plant.name}</p>
              <p className="text-muted-foreground">{s.reason}</p>
            </div>
            {s.type === "companion" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs shrink-0"
                onClick={() => onAdd(s.plant.id)}
              >
                Add
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
