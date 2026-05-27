import { MapPin, Search, SkipForward } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = {
  open: boolean;
  address: string;
  onAddressChange: (v: string) => void;
  onGps: () => void;
  onAddress: (address: string) => Promise<boolean>;
  onSkip: () => void;
};

export function GardenLocationPrompt({
  open,
  address,
  onAddressChange,
  onGps,
  onAddress,
  onSkip,
}: Props) {
  const [loading, setLoading] = useState(false);

  const submitAddress = async () => {
    if (!address.trim()) {
      toast.error("Enter an address first.");
      return;
    }
    setLoading(true);
    try {
      const ok = await onAddress(address);
      if (!ok) toast.error("Address not found. Try a simpler query.");
      else toast.success("Location set from address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            Set your garden location
          </DialogTitle>
          <DialogDescription>
            Satellite imagery works best with a precise plot location. Choose GPS, enter an
            address, or skip for a stylized ground plane.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button type="button" className="w-full" onClick={onGps}>
            Use my current location
          </Button>
          <div className="flex gap-2">
            <Input
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="123 Main St, Port Charlotte, FL"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitAddress();
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => void submitAddress()}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" />
            Skip — plain ground
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
