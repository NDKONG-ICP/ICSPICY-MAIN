import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ValidationWarning } from "@/lib/garden-rules";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

type Props = {
  warnings: ValidationWarning[];
  compact?: boolean;
};

function SeverityIcon({ severity }: { severity: ValidationWarning["severity"] }) {
  if (severity === "Error") return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
  if (severity === "Warning") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <Info className="h-4 w-4 text-chart-4 shrink-0" />;
}

export function ValidationPanel({ warnings, compact }: Props) {
  const errors = warnings.filter((w) => w.severity === "Error").length;
  const warns = warnings.filter((w) => w.severity === "Warning").length;

  return (
    <div className={compact ? "space-y-2" : "rounded-lg border border-border bg-card/60 p-3 space-y-2"}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Layout validation</h3>
        <div className="flex gap-1">
          {errors > 0 && <Badge variant="destructive">{errors} error{errors !== 1 ? "s" : ""}</Badge>}
          {warns > 0 && <Badge variant="secondary">{warns} warning{warns !== 1 ? "s" : ""}</Badge>}
          {warnings.length === 0 && <Badge variant="outline">All clear</Badge>}
        </div>
      </div>
      <ScrollArea className={compact ? "max-h-32" : "max-h-48"}>
        {warnings.length === 0 ? (
          <p className="text-xs text-muted-foreground">Spacing and companions look good.</p>
        ) : (
          <ul className="space-y-2 pr-2">
            {warnings.map((w, i) => (
              <li key={`${w.code}-${i}`} className="flex gap-2 text-xs">
                <SeverityIcon severity={w.severity} />
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
