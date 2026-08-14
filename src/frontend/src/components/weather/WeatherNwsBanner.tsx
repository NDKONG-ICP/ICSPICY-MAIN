import { AlertTriangle } from "lucide-react";

export type WeatherAlertView = {
  id: number;
  title: string;
  body: string;
  severity: "info" | "watch" | "warning";
  kind?: string;
};

const SEV_STYLES = {
  warning: "border-red-500/50 bg-red-950/40 text-red-100",
  watch: "border-orange-500/40 bg-orange-950/30 text-orange-100",
  info: "border-yellow-500/30 bg-yellow-950/20 text-yellow-50",
};

export function WeatherNwsBanner({ alerts }: { alerts: WeatherAlertView[] }) {
  const nws = alerts.filter((a) => a.kind === "nwsOfficial" || a.title.includes("Advisory") || a.title.includes("Warning") || a.title.includes("Watch"));
  const top = nws.length > 0 ? nws : alerts.filter((a) => a.severity !== "info").slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="space-y-2" data-ocid="weather-nws-banner">
      {top.slice(0, 4).map((a) => (
        <div
          key={a.id}
          className={`flex gap-3 rounded-lg border px-4 py-3 ${SEV_STYLES[a.severity]}`}
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-wide">
              {a.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed opacity-90 line-clamp-3">
              {a.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
