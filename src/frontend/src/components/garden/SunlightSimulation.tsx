import { useEffect, useMemo, useState } from "react";
import SunCalc from "suncalc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_NURSERY_COORDS } from "@/lib/garden-rules";
import { Sun } from "lucide-react";

type Props = {
  lat?: number;
  lng?: number;
  onCoordsChange?: (lat: number, lng: number) => void;
};

export function SunlightSimulation({
  lat: latProp,
  lng: lngProp,
  onCoordsChange,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const lat = latProp ?? DEFAULT_NURSERY_COORDS.lat;
  const lng = lngProp ?? DEFAULT_NURSERY_COORDS.lng;

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const sun = useMemo(() => {
    const pos = SunCalc.getPosition(now, lat, lng);
    const times = SunCalc.getTimes(now, lat, lng);
    const altitudeDeg = (pos.altitude * 180) / Math.PI;
    const azimuthDeg = ((pos.azimuth * 180) / Math.PI + 180) % 360;
    const isDay = altitudeDeg > 0;
    const fmt = (d: Date) =>
      d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return {
      altitudeDeg,
      azimuthDeg,
      isDay,
      sunrise: fmt(times.sunrise),
      sunset: fmt(times.sunset),
      solarNoon: fmt(times.solarNoon),
    };
  }, [lat, lng, now]);

  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sun className={`h-4 w-4 ${sun.isDay ? "text-amber-400" : "text-muted-foreground"}`} />
        <h3 className="text-sm font-semibold">Sunlight simulation</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="sun-lat" className="text-xs">
            Latitude
          </Label>
          <Input
            id="sun-lat"
            type="number"
            step={0.0001}
            value={lat}
            onChange={(e) => onCoordsChange?.(Number(e.target.value), lng)}
            className="h-8"
          />
        </div>
        <div>
          <Label htmlFor="sun-lng" className="text-xs">
            Longitude
          </Label>
          <Input
            id="sun-lng"
            type="number"
            step={0.0001}
            value={lng}
            onChange={(e) => onCoordsChange?.(lat, Number(e.target.value))}
            className="h-8"
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Status</dt>
        <dd>{sun.isDay ? "Daylight — good for photosynthesis" : "Night"}</dd>
        <dt className="text-muted-foreground">Sun altitude</dt>
        <dd>{sun.altitudeDeg.toFixed(1)}°</dd>
        <dt className="text-muted-foreground">Azimuth</dt>
        <dd>{sun.azimuthDeg.toFixed(0)}°</dd>
        <dt className="text-muted-foreground">Sunrise</dt>
        <dd>{sun.sunrise}</dd>
        <dt className="text-muted-foreground">Solar noon</dt>
        <dd>{sun.solarNoon}</dd>
        <dt className="text-muted-foreground">Sunset</dt>
        <dd>{sun.sunset}</dd>
      </dl>
    </div>
  );
}
