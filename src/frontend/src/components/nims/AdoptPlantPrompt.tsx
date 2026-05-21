import { useMemo, useState } from "react";
import { Sprout } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import type { ContainerSize } from "../../declarations/backend.did";

const SIZE_ROWS: ReadonlyArray<{
  label: string;
  value: string;
  size: ContainerSize;
}> = [
  { label: "1 gallon", value: "gal1", size: { Gal1: null } },
  { label: "3 gallon", value: "gal3", size: { Gal3: null } },
  { label: "5 gallon", value: "gal5", size: { Gal5: null } },
  { label: "4″ liner", value: "pot4", size: { Pot4Inch: null } },
  { label: "6″ liner", value: "pot6", size: { Pot6Inch: null } },
  { label: "In ground bed", value: "ground", size: { InGround: null } },
];

export type AdoptPlantSubmit = {
  container: ContainerSize;
  locationNotes?: string;
};

export type AdoptPlantPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user taps "Maybe later" — persists session dismissal. */
  onDismiss?: () => void;
  tokenId: bigint;
  varietyName?: string;
  isPending?: boolean;
  onAdopt: (payload: AdoptPlantSubmit) => void;
};

export function AdoptPlantPrompt({
  open,
  onOpenChange,
  onDismiss,
  tokenId,
  varietyName,
  isPending = false,
  onAdopt,
}: AdoptPlantPromptProps) {
  const defaultKey = SIZE_ROWS[0]?.value ?? "gal1";
  const [selected, setSelected] = useState(defaultKey);
  const [locationNotes, setLocationNotes] = useState("");

  const container = useMemo<ContainerSize | null>(() => {
    const row = SIZE_ROWS.find((r) => r.value === selected);
    return row?.size ?? null;
  }, [selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-adopt-dialog" className="gap-6 sm:max-w-md">
        <DialogHeader className="space-y-3 text-center sm:text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Sprout className="size-7" aria-hidden />
          </div>
          <DialogTitle className="text-balance leading-tight">
            Adopt your plant into NIMS
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {varietyName ? (
              <span
                data-ocid="nims-adopt-variety"
                className="block font-semibold text-foreground"
              >
                {varietyName}
              </span>
            ) : null}
            <span className="mt-2 block font-mono text-sm">
              NFT #{tokenId.toString()}
            </span>
            <span className="mt-2 block text-sm">
              Choose where you are growing it to unlock timelines, weather overlays,
              and stewardship logs.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Container</Label>
            <div className="grid grid-cols-2 gap-2">
              {SIZE_ROWS.map((r) => (
                <Button
                  key={r.value}
                  size="sm"
                  type="button"
                  variant={selected === r.value ? "default" : "outline"}
                  data-ocid={`nims-adopt-${r.value}`}
                  className="h-auto whitespace-normal px-3 py-2 text-xs"
                  onClick={() => setSelected(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nims-adopt-location">Location notes (optional)</Label>
            <Input
              id="nims-adopt-location"
              data-ocid="nims-adopt-location"
              placeholder="Greenhouse bench B, south row…"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onDismiss) onDismiss();
              else onOpenChange(false);
            }}
            data-ocid="nims-adopt-dismiss"
          >
            Maybe later
          </Button>
          <Button
            type="button"
            disabled={container == null || isPending}
            data-ocid="nims-adopt-cta"
            onClick={() => {
              if (!container) return;
              onAdopt({
                container,
                locationNotes: locationNotes.trim() || undefined,
              });
            }}
          >
            {isPending ? "Adopting…" : "Adopt plant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
