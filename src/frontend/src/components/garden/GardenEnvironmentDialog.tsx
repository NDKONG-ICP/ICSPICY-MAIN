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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_ENVIRONMENT,
  saveEnvironment,
  type GardenEnvironment,
} from "@/lib/garden-plant-catalog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  environment: GardenEnvironment;
  onChange: (e: GardenEnvironment) => void;
};

export function GardenEnvironmentDialog({ open, onOpenChange, environment, onChange }: Props) {
  const apply = () => {
    saveEnvironment(environment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Garden environment</DialogTitle>
          <DialogDescription>
            Filters the catalog to plants suited for your zone and garden style.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="text-sm">
            USDA Zone
            <Select
              value={environment.usdaZone}
              onValueChange={(v) =>
                onChange({ ...environment, usdaZone: v as GardenEnvironment["usdaZone"] })
              }
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["9b", "10a", "10b", "11a"] as const).map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm">
            Soil type
            <Select
              value={environment.soilType}
              onValueChange={(v) =>
                onChange({ ...environment, soilType: v as GardenEnvironment["soilType"] })
              }
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandy">Sandy</SelectItem>
                <SelectItem value="clay">Clay</SelectItem>
                <SelectItem value="loam">Loam</SelectItem>
                <SelectItem value="muck">Muck</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm">
            Garden style
            <Select
              value={environment.gardenStyle}
              onValueChange={(v) =>
                onChange({ ...environment, gardenStyle: v as GardenEnvironment["gardenStyle"] })
              }
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="food_forest">Food Forest</SelectItem>
                <SelectItem value="permaculture">Permaculture</SelectItem>
                <SelectItem value="traditional_row">Traditional Row</SelectItem>
                <SelectItem value="container">Container</SelectItem>
                <SelectItem value="raised_bed">Raised Bed</SelectItem>
                <SelectItem value="native">Native Landscape</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onChange(DEFAULT_ENVIRONMENT)}>Reset</Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
