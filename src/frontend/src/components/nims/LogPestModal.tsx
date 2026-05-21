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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const KNOWN_PESTS = [
  "Aphids",
  "Spider mites",
  "Fungus gnats",
  "Thrips",
  "Powdery mildew",
  "Downy mildew",
  "Nutrient burn",
  "Other",
] as const;

const SEVERITIES = ["Low", "Medium", "High"] as const;

export type LogPestSubmit = {
  pestName: string;
  severity: string;
  notes?: string;
};

export type LogPestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantLabel?: string;
  onSubmit: (payload: LogPestSubmit) => void;
};

export function LogPestModal({
  open,
  onOpenChange,
  plantLabel,
  onSubmit,
}: LogPestModalProps) {
  const [pest, setPest] = useState<string>(KNOWN_PESTS[0]!);
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("Low");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-log-pest" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle>Log pest scouting</DialogTitle>
          <DialogDescription>
            {plantLabel ??
              "IPM scouts stay searchable on NFT provenance after adoption."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Pest / issue</Label>
            <Select
              value={pest}
              onValueChange={setPest}
            >
              <SelectTrigger data-ocid="nims-pest-select" className="w-full">
                <SelectValue placeholder="Pick pest signal" />
              </SelectTrigger>
              <SelectContent>
                {KNOWN_PESTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITIES.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={severity === s ? "default" : "outline"}
                  data-ocid={`nims-pest-sev-${s.toLowerCase()}`}
                  onClick={() => setSeverity(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nims-pest-notes">Treatments applied</Label>
            <Textarea
              id="nims-pest-notes"
              data-ocid="nims-pest-notes"
              placeholder="Captain Jack’s foliar sweep, lacewings released…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="nims-pest-submit"
            onClick={() => {
              onSubmit({
                pestName: pest,
                severity,
                notes: notes.trim() === "" ? undefined : notes.trim(),
              });
              onOpenChange(false);
            }}
          >
            Save pest note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
