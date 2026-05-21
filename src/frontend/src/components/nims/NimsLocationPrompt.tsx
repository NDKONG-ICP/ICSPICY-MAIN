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
            Local weather
          </DialogTitle>
          <DialogDescription>
            Enable location for Open-Meteo forecasts tuned to your garden, or use
            our Port Charlotte nursery defaults.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" type="button" onClick={onUseDefault}>
            Use Port Charlotte, FL
          </Button>
          <Button type="button" onClick={onAllow}>
            Allow location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
