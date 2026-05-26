import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LOCATION_LABEL_GPS,
  LOCATION_LABEL_NURSERY,
  NURSERY_ZIP,
} from "../../hooks/useNimsLocation";

export function NimsLocationPrompt({
  open,
  onAllow,
  onUseDefault,
}: {
  open: boolean;
  onAllow: () => void;
  onUseDefault: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" data-ocid="nims-location-prompt">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            Weather & radar location
          </DialogTitle>
          <DialogDescription>
            Choose {LOCATION_LABEL_GPS} for device GPS forecasts, or{" "}
            {LOCATION_LABEL_NURSERY} (zip {NURSERY_ZIP}, Port Charlotte, FL) as
            the default.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" type="button" onClick={onUseDefault}>
            {LOCATION_LABEL_NURSERY}
          </Button>
          <Button type="button" onClick={onAllow}>
            {LOCATION_LABEL_GPS}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
