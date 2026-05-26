import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LocationPreference } from "../../hooks/useNimsLocation";
import {
  LOCATION_LABEL_GPS,
  LOCATION_LABEL_NURSERY,
} from "../../hooks/useNimsLocation";

export function NimsLocationSelector({
  preference,
  onChooseGps,
  onChooseNursery,
  className,
}: {
  preference: LocationPreference;
  onChooseGps: () => void;
  onChooseNursery: () => void;
  className?: string;
}) {
  const activeGps = preference === "gps";
  const activeNursery = preference === "default" || preference == null;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-background/80 p-0.5 text-[11px]",
        className,
      )}
      data-ocid="nims-location-selector"
      role="group"
      aria-label="Weather location"
    >
      <button
        type="button"
        onClick={onChooseGps}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors",
          activeGps
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        data-ocid="nims-location-gps"
      >
        <MapPin className="size-3" aria-hidden />
        {LOCATION_LABEL_GPS}
      </button>
      <button
        type="button"
        onClick={onChooseNursery}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors",
          activeNursery
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        data-ocid="nims-location-nursery"
      >
        {LOCATION_LABEL_NURSERY}
      </button>
    </div>
  );
}
