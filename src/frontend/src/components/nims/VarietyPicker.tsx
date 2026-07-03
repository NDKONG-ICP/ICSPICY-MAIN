import { Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VarietyPublic } from "../../declarations/backend.did";

// Cap rendered matches so a 400+ variety catalog stays snappy.
const MAX_RESULTS = 50;

export type VarietyPickerProps = {
  varieties: VarietyPublic[];
  /** Selected variety id as string; "" means none selected. */
  value: string;
  onChange: (id: string) => void;
  onCreateVariety: (name: string, species: string) => Promise<bigint>;
  isCreating?: boolean;
  /**
   * Lets parents hide their submit button while the inline create form is
   * open. Called whenever the form opens or closes.
   */
  onAddFormOpenChange?: (open: boolean) => void;
  /** DOM id prefix so multiple pickers on a page don't collide. */
  idPrefix?: string;
};

export function VarietyPicker({
  varieties,
  value,
  onChange,
  onCreateVariety,
  isCreating,
  onAddFormOpenChange,
  idPrefix = "variety-picker",
}: VarietyPickerProps) {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddFormRaw] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSpecies, setNewSpecies] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const setShowAddForm = (open: boolean) => {
    setShowAddFormRaw(open);
    onAddFormOpenChange?.(open);
  };

  // Empty catalog → jump straight to the create form.
  useEffect(() => {
    if (varieties.length === 0 && !showAddForm) {
      setShowAddFormRaw(true);
      onAddFormOpenChange?.(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varieties.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return varieties;
    return varieties.filter(
      (v) =>
        v.name.toLowerCase().includes(q) || v.species.toLowerCase().includes(q),
    );
  }, [search, varieties]);

  const shown = filtered.slice(0, MAX_RESULTS);
  const hiddenCount = filtered.length - shown.length;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreateError(null);
    try {
      const id = await onCreateVariety(name, newSpecies.trim() || "Plant");
      onChange(id.toString());
      setShowAddForm(false);
      setNewName("");
      setNewSpecies("");
      setSearch("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not add variety");
    }
  };

  if (showAddForm) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium">New variety</p>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-new-name`}>Name</Label>
          <Input
            id={`${idPrefix}-new-name`}
            placeholder="e.g. Cherokee Purple Tomato"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-new-species`}>
            Species / type (optional)
          </Label>
          <Input
            id={`${idPrefix}-new-species`}
            placeholder="Tomato, Capsicum, Basil…"
            value={newSpecies}
            onChange={(e) => setNewSpecies(e.target.value)}
          />
        </div>
        {createError && <p className="text-xs text-destructive">{createError}</p>}
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
            disabled={!newName.trim() || isCreating}
            onClick={() => void handleCreate()}
          >
            {isCreating ? (
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
    );
  }

  return (
    <div className="space-y-2">
      <Input
        id={`${idPrefix}-search`}
        placeholder="Search varieties — tomato, basil, reaper…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
        {shown.map((v) => (
          <button
            key={v.id.toString()}
            type="button"
            className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted ${
              value === v.id.toString()
                ? "bg-primary/10 ring-1 ring-primary"
                : ""
            }`}
            onClick={() => onChange(v.id.toString())}
          >
            <span className="font-medium">{v.name}</span>
            <span className="ml-2 truncate text-xs text-muted-foreground">
              {v.species}
            </span>
          </button>
        ))}
        {shown.length === 0 && (
          <p className="px-2 py-2 text-center text-xs text-muted-foreground">
            No matches in the catalog.
          </p>
        )}
        {hiddenCount > 0 && (
          <p className="px-2 py-1 text-center text-[11px] text-muted-foreground">
            +{hiddenCount} more — refine your search
          </p>
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
          {search.trim()
            ? `Add "${search.trim()}" as a new variety`
            : "Add new variety…"}
        </button>
      </div>
    </div>
  );
}
