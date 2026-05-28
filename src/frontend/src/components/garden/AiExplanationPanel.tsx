import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  explanation: string;
  onRegenerate: () => void;
  onDismiss: () => void;
};

export function AiExplanationPanel({ explanation, onRegenerate, onDismiss }: Props) {
  return (
    <div className="absolute top-20 right-4 z-30 w-72 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-xl p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium">🤖 AI Design Notes</span>
        <button type="button" onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{explanation}</p>
      <Button size="sm" variant="outline" className="w-full" onClick={onRegenerate}>
        Regenerate
      </Button>
    </div>
  );
}
