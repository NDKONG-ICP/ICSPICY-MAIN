import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  RegisterPlantBatchResult,
  RegisterPlantCellOutcome,
  RegisterPlantSharedData,
  VarietyPublic,
} from "../../declarations/backend.did";
import {
  CONTAINER_SIZE_OPTIONS,
  buildContainerSize,
} from "../../pages/nims-utils";
import { VarietyPicker } from "./VarietyPicker";

export type RegisterPlantBatchSubmit = {
  sharedData: RegisterPlantSharedData;
  cellIndices: bigint[];
};

export type RegisterPlantBatchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trayId: bigint;
  cellIndices: bigint[];
  cellLabels: string[];
  varieties: VarietyPublic[];
  isCreatingVariety?: boolean;
  isPending?: boolean;
  batchResult?: RegisterPlantBatchResult | null;
  onCreateVariety: (name: string, species: string) => Promise<bigint>;
  onSubmit: (payload: RegisterPlantBatchSubmit) => void | Promise<void>;
  onClearResult?: () => void;
};

function outcomeLabel(outcome: RegisterPlantCellOutcome): {
  tone: "ok" | "skip" | "err";
  text: string;
} {
  if ("ok" in outcome) {
    return {
      tone: "ok",
      text: `Plant #${outcome.ok.plant_id.toString()} registered (no NFT until germination)`,
    };
  }
  if ("skipped" in outcome) {
    return { tone: "skip", text: outcome.skipped };
  }
  return { tone: "err", text: outcome.err };
}

export function RegisterPlantBatchModal({
  open,
  onOpenChange,
  trayId,
  cellIndices,
  cellLabels,
  varieties,
  isCreatingVariety,
  isPending,
  batchResult,
  onCreateVariety,
  onSubmit,
  onClearResult,
}: RegisterPlantBatchModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [genetics, setGenetics] = useState("");
  const [notes, setNotes] = useState("");
  const [containerOption, setContainerOption] = useState("cell72");
  const [containerOther, setContainerOther] = useState("");
  const [dateSowed, setDateSowed] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    if (!open) {
      setSelectedId("");
      setAddFormOpen(false);
      setGenetics("");
      setNotes("");
      setContainerOption("cell72");
      setContainerOther("");
      setDateSowed(new Date().toISOString().split("T")[0]);
      onClearResult?.();
      return;
    }
    if (varieties.length > 0 && !selectedId) {
      setSelectedId(varieties[0]!.id.toString());
    }
  }, [open, varieties, selectedId, onClearResult]);

  const sortedCells = useMemo(
    () => [...cellIndices].sort((a, b) => Number(a - b)),
    [cellIndices],
  );

  const canSubmit =
    selectedId !== "" && !addFormOpen && sortedCells.length > 0 && !isPending;

  function buildSharedData(): RegisterPlantSharedData {
    const plantingNs = BigInt(new Date(dateSowed).getTime()) * 1_000_000n;
    const variety = varieties.find((v) => v.id.toString() === selectedId);
    return {
      tray_id: trayId,
      variety_id: BigInt(selectedId),
      container_size: [buildContainerSize(containerOption, containerOther)],
      origin: ["Port Charlotte, FL"],
      planting_date: [plantingNs],
      notes: notes.trim(),
      genetics: genetics.trim() || variety?.name || "",
      common_name: [],
      latin_name: variety?.species ? [variety.species] : [],
    };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="nims-modal-register-batch"
        className="max-w-lg max-h-[90vh] overflow-y-auto gap-6"
      >
        <DialogHeader>
          <DialogTitle>
            Batch register · {sortedCells.length} cell
            {sortedCells.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            One provenance NFT per cell (100k range). Shared variety and sow
            date apply to all selected cells.
          </DialogDescription>
        </DialogHeader>

        {!batchResult ? (
          <>
            <div className="flex flex-wrap gap-1">
              {cellLabels.map((label, i) => (
                <Badge key={`${label}-${i}`} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Variety</Label>
              <VarietyPicker
                idPrefix="nims-batch"
                varieties={varieties}
                value={selectedId}
                onChange={setSelectedId}
                onCreateVariety={onCreateVariety}
                isCreating={isCreatingVariety}
                onAddFormOpenChange={setAddFormOpen}
              />
            </div>

            {!addFormOpen && (
              <>
                <div className="space-y-2">
                  <Label>Container</Label>
                  <select
                    className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                    value={containerOption}
                    onChange={(e) => setContainerOption(e.target.value)}
                  >
                    {CONTAINER_SIZE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {containerOption === "other" && (
                    <Input
                      placeholder="Custom size"
                      value={containerOther}
                      onChange={(e) => setContainerOther(e.target.value)}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Sown date</Label>
                  <Input
                    type="date"
                    value={dateSowed}
                    onChange={(e) => setDateSowed(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Genetics (optional)</Label>
                  <Input
                    value={genetics}
                    onChange={(e) => setGenetics(e.target.value)}
                    placeholder="Seed lot / cross"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <span className="text-emerald-500">
                ✓ {batchResult.succeeded.toString()} minted
              </span>
              <span className="text-muted-foreground">
                ↷ {batchResult.skipped.toString()} skipped
              </span>
              <span className="text-destructive">
                ✗ {batchResult.failed.toString()} failed
              </span>
            </div>
            <ul className="max-h-64 overflow-y-auto space-y-1 text-xs border rounded-md p-2">
              {batchResult.results.map((row) => {
                const { tone, text } = outcomeLabel(row.outcome);
                return (
                  <li
                    key={row.cell_index.toString()}
                    className="flex items-start gap-2 py-0.5"
                  >
                    {tone === "ok" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : tone === "skip" ? (
                      <span className="w-3.5 shrink-0">↷</span>
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <span>
                      <strong>Cell {row.cell_index.toString()}:</strong> {text}
                    </span>
                  </li>
                );
              })}
            </ul>
            {batchResult.failed > 0n && (
              <p className="text-xs text-muted-foreground">
                Re-select failed or empty cells and run batch again — cells
                that already have NFTs are skipped automatically.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            {batchResult ? "Close" : "Cancel"}
          </Button>
          {!batchResult && !addFormOpen && (
            <Button
              type="button"
              data-ocid="nims-batch-register-submit"
              disabled={!canSubmit}
              onClick={() => {
                void onSubmit({
                  sharedData: buildSharedData(),
                  cellIndices: sortedCells,
                });
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Minting…
                </>
              ) : (
                `Register ${sortedCells.length} cell${sortedCells.length !== 1 ? "s" : ""}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
