import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { SeedSource, VarietyPublic } from "../../declarations/backend.did";
import {
  seedSourceLabel,
  unwrapOpt,
  useAddSeedLot,
  useAddVendor,
  useMyCrosses,
  useMySeedBank,
  useMyVendors,
  useRecordCross,
  useSeedBankStats,
} from "../../hooks/useSeedBank";
import { exportSeedLotsCsv } from "../../lib/nims-export-mappers";

function fmtMonth(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

const SOURCE_OPTIONS: { label: string; value: SeedSource }[] = [
  { label: "Own harvest", value: { OwnHarvest: null } },
  { label: "Vendor", value: { Vendor: null } },
  { label: "Trade", value: { Trade: null } },
  { label: "Gift", value: { Gift: null } },
  { label: "Cross", value: { Cross: null } },
];

type SeedBankView = "collection" | "breeding" | "vendors";

export type SeedBankPanelProps = {
  varieties: VarietyPublic[];
  onPlantFromLot: (varietyId: bigint) => void;
};

export function SeedBankPanel({
  varieties,
  onPlantFromLot,
}: SeedBankPanelProps) {
  const [view, setView] = useState<SeedBankView>("collection");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(true);
  const [varietyFilter, setVarietyFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useSeedBankStats();
  const { data: lots = [], isLoading: lotsLoading } = useMySeedBank();
  const { data: crosses = [], isLoading: crossesLoading } = useMyCrosses();
  const { data: vendors = [], isLoading: vendorsLoading } = useMyVendors();

  const addSeedLot = useAddSeedLot();
  const recordCross = useRecordCross();
  const addVendor = useAddVendor();

  const [addSeedsOpen, setAddSeedsOpen] = useState(false);
  const [recordCrossOpen, setRecordCrossOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);

  const varietyName = (id: bigint) =>
    varieties.find((v) => v.id === id)?.name ?? `#${id.toString()}`;

  const vendorName = (id: bigint | undefined) =>
    vendors.find((v) => v.id === id)?.name;

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      if (activeOnly && !lot.isActive) return false;
      if (
        varietyFilter !== "all" &&
        lot.varietyId.toString() !== varietyFilter
      ) {
        return false;
      }
      if (sourceFilter === "all") return true;
      return seedSourceLabel(lot.source).toLowerCase().includes(sourceFilter);
    });
  }, [lots, activeOnly, varietyFilter, sourceFilter]);

  return (
    <div className="space-y-4" data-ocid="nims-seed-bank">
      <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
        {statsLoading ? (
          <Skeleton className="h-5 w-full" />
        ) : (
          <p className="text-muted-foreground">
            Total lots:{" "}
            <strong className="text-foreground">
              {stats?.totalLots.toString() ?? "0"}
            </strong>
            {" · "}
            Varieties:{" "}
            <strong className="text-foreground">
              {stats?.varietyCount.toString() ?? "0"}
            </strong>
            {" · "}
            Active crosses:{" "}
            <strong className="text-foreground">
              {stats?.activeCrosses.toString() ?? "0"}
            </strong>
          </p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            exportSeedLotsCsv(filteredLots);
            toast.success("Seed bank CSV downloaded");
          }}
          disabled={filteredLots.length === 0}
        >
          📥 Export CSV
        </Button>
        {(
          [
            ["collection", "Seed collection"],
            ["breeding", "Breeding log"],
            ["vendors", "Vendors"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={view === id ? "default" : "outline"}
            onClick={() => setView(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {view === "collection" && (
        <>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Variety</Label>
              <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {varieties.map((v) => (
                    <SelectItem key={v.id.toString()} value={v.id.toString()}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="cross">Cross</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant={activeOnly ? "secondary" : "outline"}
              className="h-8 text-xs"
              onClick={() => setActiveOnly((v) => !v)}
            >
              {activeOnly ? "Active only" : "Include depleted"}
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => setAddSeedsOpen(true)}
            >
              <Plus className="size-4 mr-1" /> Add seeds
            </Button>
          </div>

          {lotsLoading ? (
            <Skeleton className="h-32" />
          ) : filteredLots.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No seed lots yet. Harvest from a plant or tap Add seeds.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredLots.map((lot) => {
                const qty = unwrapOpt(lot.quantity);
                const gen = unwrapOpt(lot.generation);
                const rate = unwrapOpt(lot.germinationRate);
                const vid = unwrapOpt(lot.vendorId);
                const sourceBadge =
                  "Vendor" in lot.source && vid != null
                    ? (vendorName(vid) ?? "Vendor")
                    : seedSourceLabel(lot.source);
                return (
                  <div
                    key={lot.id.toString()}
                    className="rounded-xl border border-border p-3 space-y-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          🌶️ {varietyName(lot.varietyId)}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {sourceBadge}
                        </Badge>
                      </div>
                      {!lot.isActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          Depleted
                        </Badge>
                      )}
                    </div>
                    {qty != null && (
                      <p className="text-muted-foreground">
                        ~{qty.toString()} seeds
                      </p>
                    )}
                    {gen && <p>Generation: {gen}</p>}
                    {rate != null && <p>Germination: {rate.toString()}%</p>}
                    <p className="text-xs text-muted-foreground">
                      Acquired {fmtMonth(lot.acquiredDate)}
                    </p>
                    {unwrapOpt(lot.notes) && (
                      <p className="text-xs italic">{unwrapOpt(lot.notes)}</p>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => onPlantFromLot(lot.varietyId)}
                    >
                      <Sprout className="size-3.5 mr-1" />
                      Plant from this lot
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "breeding" && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRecordCrossOpen(true)}>
              <Plus className="size-4 mr-1" /> Record cross
            </Button>
          </div>
          {crossesLoading ? (
            <Skeleton className="h-24" />
          ) : crosses.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No breeding crosses logged yet.
            </p>
          ) : (
            <div className="space-y-3">
              {crosses.map((cross) => (
                <div
                  key={cross.id.toString()}
                  className="rounded-xl border border-border p-3 text-sm space-y-1"
                >
                  <p className="font-semibold">{cross.name}</p>
                  <p className="text-muted-foreground">
                    {varietyName(cross.motherVarietyId)} ×{" "}
                    {varietyName(cross.fatherVarietyId)}
                  </p>
                  <p>Generation: {cross.generation}</p>
                  {unwrapOpt(cross.expectedTraits) && (
                    <p className="text-xs">
                      Expected: {unwrapOpt(cross.expectedTraits)}
                    </p>
                  )}
                  {unwrapOpt(cross.seedLotId) && (
                    <p className="text-xs text-primary">
                      Seed lot #{unwrapOpt(cross.seedLotId)!.toString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {fmtMonth(cross.crossDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "vendors" && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddVendorOpen(true)}>
              <Plus className="size-4 mr-1" /> Add vendor
            </Button>
          </div>
          {vendorsLoading ? (
            <Skeleton className="h-24" />
          ) : vendors.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No vendors saved yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {vendors.map((v) => (
                <li
                  key={v.id.toString()}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{v.name}</p>
                  {unwrapOpt(v.website) && (
                    <p className="text-xs text-primary">
                      {unwrapOpt(v.website)}
                    </p>
                  )}
                  {unwrapOpt(v.notes) && (
                    <p className="text-xs text-muted-foreground">
                      {unwrapOpt(v.notes)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <AddSeedsDialog
        open={addSeedsOpen}
        onOpenChange={setAddSeedsOpen}
        varieties={varieties}
        vendors={vendors}
        isPending={addSeedLot.isPending}
        onSubmit={async (payload) => {
          try {
            await addSeedLot.mutateAsync(payload);
            setAddSeedsOpen(false);
            toast.success("Seed lot added");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />

      <RecordCrossDialog
        open={recordCrossOpen}
        onOpenChange={setRecordCrossOpen}
        varieties={varieties}
        isPending={recordCross.isPending}
        onSubmit={async (payload) => {
          try {
            await recordCross.mutateAsync(payload);
            setRecordCrossOpen(false);
            toast.success("Cross recorded");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />

      <AddVendorDialog
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
        isPending={addVendor.isPending}
        onSubmit={async (payload) => {
          try {
            await addVendor.mutateAsync(payload);
            setAddVendorOpen(false);
            toast.success("Vendor added");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />
    </div>
  );
}

function AddSeedsDialog({
  open,
  onOpenChange,
  varieties,
  vendors,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  varieties: VarietyPublic[];
  vendors: { id: bigint; name: string }[];
  isPending?: boolean;
  onSubmit: (p: {
    varietyId: bigint;
    source: SeedSource;
    quantity?: bigint;
    vendorId?: bigint;
    notes?: string;
  }) => void | Promise<void>;
}) {
  const [varietyId, setVarietyId] = useState(varieties[0]?.id.toString() ?? "");
  const [sourceIdx, setSourceIdx] = useState("0");
  const [vendorId, setVendorId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const source = SOURCE_OPTIONS[Number(sourceIdx)]?.value ?? {
    OwnHarvest: null,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add seed lot</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Variety</Label>
            <Select value={varietyId} onValueChange={setVarietyId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {varieties.map((v) => (
                  <SelectItem key={v.id.toString()} value={v.id.toString()}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={sourceIdx} onValueChange={setSourceIdx}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s, i) => (
                  <SelectItem key={s.label} value={String(i)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {"Vendor" in source && vendors.length > 0 && (
            <div className="space-y-1">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id.toString()} value={v.id.toString()}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!varietyId || isPending}
            onClick={() =>
              void onSubmit({
                varietyId: BigInt(varietyId),
                source,
                quantity: quantity ? BigInt(quantity) : undefined,
                vendorId: vendorId ? BigInt(vendorId) : undefined,
                notes: notes.trim() || undefined,
              })
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordCrossDialog({
  open,
  onOpenChange,
  varieties,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  varieties: VarietyPublic[];
  isPending?: boolean;
  onSubmit: (p: {
    name: string;
    motherVarietyId: bigint;
    fatherVarietyId: bigint;
    expectedTraits?: string;
    notes?: string;
    generation?: string;
  }) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [motherId, setMotherId] = useState(varieties[0]?.id.toString() ?? "");
  const [fatherId, setFatherId] = useState(
    varieties[1]?.id.toString() ?? varieties[0]?.id.toString() ?? "",
  );
  const [generation, setGeneration] = useState("F1");
  const [expectedTraits, setExpectedTraits] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record breeding cross</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Cross name</Label>
            <Input
              placeholder="Reaper × Scorpion F1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Mother (♀)</Label>
              <Select value={motherId} onValueChange={setMotherId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {varieties.map((v) => (
                    <SelectItem key={v.id.toString()} value={v.id.toString()}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Father (♂)</Label>
              <Select value={fatherId} onValueChange={setFatherId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {varieties.map((v) => (
                    <SelectItem key={v.id.toString()} value={v.id.toString()}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Generation</Label>
            <Input
              value={generation}
              onChange={(e) => setGeneration(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Expected traits</Label>
            <Input
              value={expectedTraits}
              onChange={(e) => setExpectedTraits(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !motherId || !fatherId || isPending}
            onClick={() =>
              void onSubmit({
                name: name.trim(),
                motherVarietyId: BigInt(motherId),
                fatherVarietyId: BigInt(fatherId),
                generation,
                expectedTraits: expectedTraits.trim() || undefined,
                notes: notes.trim() || undefined,
              })
            }
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save cross"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVendorDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isPending?: boolean;
  onSubmit: (p: {
    name: string;
    website?: string;
    notes?: string;
  }) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add seed vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              placeholder="PuckerButt Pepper Company"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Website</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || isPending}
            onClick={() =>
              void onSubmit({
                name: name.trim(),
                website: website.trim() || undefined,
                notes: notes.trim() || undefined,
              })
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
