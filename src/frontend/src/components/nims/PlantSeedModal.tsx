import { Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import type { VarietyPublic } from "../../declarations/backend.did";

export type PlantSeedSubmit = {
  varietyId: bigint;
  genetics?: string;
  notes?: string;
};

export type PlantSeedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotLabel?: string;
  varieties: VarietyPublic[];
  initialVarietyId?: bigint;
  isCreatingVariety?: boolean;
  onCreateVariety: (name: string, species: string) => Promise<bigint>;
  onSubmit: (payload: PlantSeedSubmit) => void | Promise<void>;
};

const ADD_NEW = "__add_new__";

export function PlantSeedModal({
  open,
  onOpenChange,
  slotLabel,
  varieties,
  initialVarietyId,
  isCreatingVariety,
  onCreateVariety,
  onSubmit,
}: PlantSeedModalProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSpecies, setNewSpecies] = useState("Capsicum");
  const [genetics, setGenetics] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedId("");
      setShowAddForm(false);
      setNewName("");
      setNewSpecies("Capsicum");
      setGenetics("");
      setNotes("");
      setCreateError(null);
      return;
    }
    if (varieties.length > 0 && !selectedId) {
      const preferred =
        initialVarietyId != null
          ? varieties.find((v) => v.id === initialVarietyId)?.id.toString()
          : undefined;
      setSelectedId(preferred ?? varieties[0]!.id.toString());
    }
    if (varieties.length === 0) {
      setShowAddForm(true);
    }
  }, [open, varieties, selectedId, initialVarietyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return varieties;
    return varieties.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.species.toLowerCase().includes(q),
    );
  }, [search, varieties]);

  const handleCreateVariety = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreateError(null);
    try {
      const id = await onCreateVariety(name, newSpecies.trim() || "Capsicum");
      setSelectedId(id.toString());
      setShowAddForm(false);
      setNewName("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not add variety");
    }
  };

  const canSubmit =
    selectedId !== "" && selectedId !== ADD_NEW && !showAddForm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="nims-modal-plant-seed" className="max-w-md gap-6">
        <DialogHeader>
          <DialogTitle>Plant seed · {slotLabel ?? "Tray cell"}</DialogTitle>
          <DialogDescription>
            Pick a variety from the catalog, or add a new one inline.
          </DialogDescription>
        </DialogHeader>

        {varieties.length === 0 && !showAddForm && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            <p>No varieties in your catalog yet. Add one first!</p>
            <Button
              type="button"
              className="mt-3"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="mr-1 size-4" />
              Add variety
            </Button>
          </div>
        )}

        {!showAddForm && varieties.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nims-seed-search">Variety</Label>
              <Input
                id="nims-seed-search"
                placeholder="Search catalog…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No matches — add a new variety below.
                </p>
              ) : (
                filtered.map((v) => (
                  <button
                    key={v.id.toString()}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted ${
                      selectedId === v.id.toString() ? "bg-primary/10 ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedId(v.id.toString())}
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="text-xs text-muted-foreground">{v.species}</span>
                  </button>
                ))
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-primary hover:bg-muted"
                onClick={() => {
                  setShowAddForm(true);
                  setNewName(search.trim());
                }}
              >
                <Plus className="size-4" />
                Add new variety…
              </button>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium">New variety</p>
            <div className="space-y-2">
              <Label htmlFor="nims-new-var-name">Name</Label>
              <Input
                id="nims-new-var-name"
                placeholder="e.g. Carolina Reaper"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nims-new-var-species">Species</Label>
              <Input
                id="nims-new-var-species"
                placeholder="Capsicum"
                value={newSpecies}
                onChange={(e) => setNewSpecies(e.target.value)}
              />
            </div>
            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}
            <div className="flex gap-2">
              {varieties.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                disabled={!newName.trim() || isCreatingVariety}
                onClick={() => void handleCreateVariety()}
              >
                {isCreatingVariety ? (
                  <>
                    <Loader2 className="mr-1 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save variety"
                )}
              </Button>
            </div>
          </div>
        )}

        {!showAddForm && (
          <>
            <div className="space-y-2">
              <Label htmlFor="nims-seed-gen">Genetics (optional)</Label>
              <Input
                id="nims-seed-gen"
                data-ocid="nims-seed-genetics"
                placeholder="Parent cross or seed lot batch"
                value={genetics}
                onChange={(e) => setGenetics(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nims-seed-notes">Notes</Label>
              <Textarea
                id="nims-seed-notes"
                data-ocid="nims-seed-notes"
                placeholder="Cold strat days, sanitization bath…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!showAddForm && (
            <Button
              type="button"
              data-ocid="nims-seed-submit"
              disabled={!canSubmit}
              onClick={() => {
                void onSubmit({
                  varietyId: BigInt(selectedId),
                  genetics: genetics.trim() === "" ? undefined : genetics.trim(),
                  notes: notes.trim() === "" ? undefined : notes.trim(),
                });
              }}
            >
              Plant seed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
