import type { Backend } from "@/backend";
import { PlantStage } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type {
  PlantStage as DidPlantStage,
  PlantLifecycle,
} from "@/declarations/backend.did";
import type { _SERVICE } from "@/declarations/backend.did";
import { useActorReady } from "@/hooks/useActorReady";
import {
  type ClaimTokenAdminPublic,
  useClaimTokensAdmin,
  useGenerateClaimTokens,
  useRevokeClaimTokenAdmin,
} from "@/hooks/useAdminShop";
import { useBackendActor } from "@/hooks/useBackend";
import { usePlants, useTrays } from "@/hooks/useBackend";
import { usePlantsForSale } from "@/hooks/useNims";
import type { Plant, Tray } from "@/types";
import type { ActorSubclass } from "@dfinity/agent";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Printer,
  QrCode,
  Search,
  ShieldOff,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import {
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

/** Public claim URL scanned from printed labels — keep in sync with app routes. */
const CLAIM_BASE = "https://icspicy.app/claim";

const STAGE_LABELS: Record<PlantStage, string> = {
  [PlantStage.Seed]: "🌱 Seed",
  [PlantStage.Seedling]: "🌿 Seedling",
  [PlantStage.Mature]: "🌶️ Mature",
};

function didPlantStage(stage: DidPlantStage): string {
  if ("Seed" in stage) return STAGE_LABELS[PlantStage.Seed];
  if ("Seedling" in stage) return STAGE_LABELS[PlantStage.Seedling];
  return STAGE_LABELS[PlantStage.Mature];
}

function unifyStage(stage: PlantStage | DidPlantStage | undefined): string {
  if (stage === undefined) return "—";
  if (typeof stage === "object") return didPlantStage(stage);
  return STAGE_LABELS[stage as PlantStage] ?? String(stage);
}

type LabelSource = "unlabeled_nft" | "tray" | "comma_ids" | "for_sale";

export type AdminQrLabelRow = {
  plantId: bigint;
  nftTokenId: bigint;
  variety: string;
  stageLabel: string;
  claimToken: string;
};

function svcRaw(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function parseDecimalBigint(s: string | undefined | null): bigint | null {
  if (!s) return null;
  const t = String(s).trim();
  if (!t || !/^\d+$/.test(t)) return null;
  try {
    return BigInt(t);
  } catch {
    return null;
  }
}

async function mapInSlices<T, R>(
  items: readonly T[],
  sliceSize: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  const size = Math.max(1, sliceSize);
  for (let offset = 0; offset < items.length; offset += size) {
    const batch = items.slice(offset, offset + size);
    const part = await Promise.all(
      batch.map((item, idx) => mapper(item, offset + idx)),
    );
    out.push(...part);
  }
  return out;
}

/** Claim QR payload — `{claimToken}` is `spcy_…`. */
function qrPayload(claimToken: string): string {
  return `${CLAIM_BASE}/${claimToken}`;
}

function QrLabelImage({ claimToken }: { claimToken: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const url = useMemo(() => qrPayload(claimToken), [claimToken]);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!src) {
    return (
      <Skeleton className="w-[104px] h-[104px] rounded-md flex-shrink-0" />
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={104}
      height={104}
      className="flex-shrink-0 rounded-sm"
    />
  );
}

/** Merge rows by plant id — later duplicates win last (should not happen). */
function mergePreferUniquePlant(a: AdminQrLabelRow[]): AdminQrLabelRow[] {
  const m = new Map<string, AdminQrLabelRow>();
  for (const row of a) m.set(row.plantId.toString(), row);
  return [...m.values()].sort((x, y) =>
    x.plantId < y.plantId ? -1 : x.plantId > y.plantId ? 1 : 0,
  );
}

export function AdminQRLabelsTab(): ReactNode {
  const { actor } = useBackendActor();
  const did = svcRaw(actor);
  const { actorReady } = useActorReady();

  const { data: plants = [], isLoading: plantsLoading } = usePlants();
  const { data: trays = [] } = useTrays();
  const { data: forSaleLifecycles = [] } = usePlantsForSale(
    undefined,
    undefined,
  );

  const plantById = useMemo(() => {
    const m = new Map<string, Plant>();
    for (const p of plants as Plant[]) {
      m.set(p.id.toString(), p as Plant);
    }
    return m;
  }, [plants]);

  const [source, setSource] = useState<LabelSource>("unlabeled_nft");
  const [trayId, setTrayId] = useState<string>("");
  const [commaPlantIds, setCommaPlantIds] = useState("");

  const [labelRows, setLabelRows] = useState<AdminQrLabelRow[]>([]);

  const [tokenSearchRaw, setTokenSearchRaw] = useState("");
  const tokenSearch = useDeferredValue(tokenSearchRaw.trim());
  const { data: tokensList = [], isLoading: tokensLoading } =
    useClaimTokensAdmin(tokenSearch);
  const revoke = useRevokeClaimTokenAdmin();
  const generateBatch = useGenerateClaimTokens();

  const parsedTray =
    trayId.trim() !== "" && /^\d+$/.test(trayId.trim())
      ? BigInt(trayId.trim())
      : null;

  const { data: trayCells } = useQuery({
    queryKey: ["admin", "qrLabelTrayGrid", parsedTray?.toString(), actorReady],
    queryFn: async () => {
      if (!actor || parsedTray === null) return [];
      return actor.getTrayGrid(parsedTray);
    },
    enabled: !!actor && actorReady && source === "tray" && parsedTray !== null,
  });

  const trayPreviewCount = useMemo(() => {
    if (!trayCells) return 0;
    let n = 0;
    for (const c of trayCells) {
      const pid = c.plantId?.[0] ?? c.inventoryPlantId?.[0];
      const tid = c.nftTokenId?.[0];
      if (pid !== undefined && tid !== undefined) n += 1;
    }
    return n;
  }, [trayCells]);

  const buildCandidates = (): {
    plantId: bigint;
    nftTokenId: bigint;
    variety: string;
    stageLabel: string;
  }[] => {
    const pushed = new Map<string, true>();
    const out: {
      plantId: bigint;
      nftTokenId: bigint;
      variety: string;
      stageLabel: string;
    }[] = [];

    const push = (
      plantId: bigint,
      nftTokenId: bigint,
      varietyHint: string,
      stageFallback: PlantStage | DidPlantStage | undefined,
    ) => {
      const k = plantId.toString();
      if (pushed.has(k)) return;
      pushed.set(k, true);

      const p = plantById.get(k);

      const varietyDisp =
        (varietyHint?.trim()?.length ?? 0) > 0
          ? varietyHint.trim()
          : p?.variety?.trim()
            ? String(p.variety)
            : "—";

      const stageDisp =
        p?.stage !== undefined
          ? unifyStage(p.stage)
          : stageFallback !== undefined
            ? unifyStage(stageFallback)
            : "—";

      out.push({
        plantId,
        nftTokenId,
        variety: varietyDisp,
        stageLabel: stageDisp,
      });
    };

    if (source === "comma_ids") {
      const chunks = commaPlantIds.split(/[,]+/).flatMap((s) =>
        String(s)
          .split(/\s+/)
          .map((x) => x.trim())
          .filter(Boolean),
      );

      for (const s of chunks) {
        const pid = parseDecimalBigint(s);
        if (pid === null) continue;
        const plant = plantById.get(pid.toString());
        if (!plant) continue;

        const nid = parseDecimalBigint(plant.nft_id);
        if (!nid) continue;

        push(pid, nid, plant.variety, plant.stage);
      }

      return out;
    }

    if (source === "for_sale") {
      for (const lc of forSaleLifecycles as PlantLifecycle[]) {
        const tidOpt = lc.nftTokenId;
        const nft = tidOpt?.length ? tidOpt[0] : undefined;
        if (nft === undefined) continue;

        push(lc.plant.id, nft, lc.plant.variety, lc.plant.stage);
      }
      return out;
    }

    if (source === "tray") {
      if (!trayCells) return [];
      for (const cell of trayCells) {
        const pid = cell.plantId?.[0] ?? cell.inventoryPlantId?.[0];
        const tid = cell.nftTokenId?.[0];

        if (pid === undefined || tid === undefined) continue;

        const vname = cell.varietyName?.[0] ?? "";
        push(pid, tid, vname, undefined);
      }
      return out;
    }

    for (const p of plants as Plant[]) {
      const nid = parseDecimalBigint(p.nft_id);
      if (!nid) continue;

      push(p.id as bigint, nid, p.variety, p.stage);
    }

    return out;
  };

  const handlePrepareLabels = async () => {
    if (!did) return;

    let candidates = buildCandidates();

    if (source === "comma_ids") {
      const invalid =
        commaPlantIds.trim().length > 0 && candidates.length === 0;

      if (invalid) {
        toast.error(
          "No usable plants matched. Use numeric IDs for minted NFT plants.",
        );
        return;
      }
    }

    if (
      source === "tray" &&
      (trayCells === undefined || candidates.length === 0)
    ) {
      toast.error(
        trayCells?.length === 0
          ? "This tray grid is empty."
          : "No tray cells combine a plant slot with an NFT token ID.",
      );
      return;
    }

    if (candidates.length === 0) {
      toast.error("No qualifying plants for this selector.");
      return;
    }

    try {
      const claims = await mapInSlices(candidates, 24, async (row) => {
        const opt = await did.getPlantClaimToken(row.plantId);
        let tokenExisting: string | null = null;
        if (
          typeof opt !== "undefined" &&
          Array.isArray(opt) &&
          opt.length > 0 &&
          typeof opt[0] === "string"
        ) {
          const tkn = opt[0].trim();
          if (tkn) tokenExisting = tkn;
        }

        return { row, tokenExisting };
      });

      const existingRowsFull: AdminQrLabelRow[] = claims
        .filter((x) => x.tokenExisting)
        .map((x) => ({
          plantId: x.row.plantId,
          nftTokenId: x.row.nftTokenId,
          variety: x.row.variety,
          stageLabel: x.row.stageLabel,
          claimToken: x.tokenExisting as string,
        }));

      let needMint = claims.filter((x) => !x.tokenExisting).map((x) => x.row);

      let generatedFull: AdminQrLabelRow[] = [];

      const mintNftIds = [...new Set(needMint.map((r) => r.nftTokenId))];

      if (mintNftIds.length > 0) {
        const created = await generateBatch.mutateAsync(mintNftIds);

        const byTok = new Map(
          created.map((c) => [c.tokenId.toString(), c.claimToken]),
        );

        generatedFull = needMint
          .map((row) => {
            const ct = byTok.get(row.nftTokenId.toString());
            if (!ct) return null;
            return {
              plantId: row.plantId,
              nftTokenId: row.nftTokenId,
              variety: row.variety,
              stageLabel: row.stageLabel,
              claimToken: ct,
            } satisfies AdminQrLabelRow;
          })
          .filter((x): x is AdminQrLabelRow => !!x);
      }

      let combinedFull: AdminQrLabelRow[];

      if (source === "unlabeled_nft") {
        combinedFull = mergePreferUniquePlant(generatedFull);
      } else {
        combinedFull = mergePreferUniquePlant([
          ...existingRowsFull,
          ...generatedFull,
        ]);
      }

      setLabelRows(combinedFull);

      const alreadyLabeled = candidates.length - needMint.length;

      if (combinedFull.length === 0) {
        toast.info(
          source === "unlabeled_nft"
            ? alreadyLabeled > 0
              ? `${alreadyLabeled} plant(s) already have claim codes — none were generated.`
              : "Nothing was generated."
            : "Nothing to print yet — resolve missing claim codes or adjust the selection.",
        );
      } else {
        toast.success(
          source === "unlabeled_nft"
            ? `${combinedFull.length} new label slot(s)${
                alreadyLabeled > 0
                  ? `. Skipped ${alreadyLabeled} already labeled.`
                  : ""
              }`
            : `${combinedFull.length} label slot(s)` +
                ` — reused ${existingRowsFull.length}; minted ${generatedFull.length}`,
        );
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to build claim QR labels.",
      );
    }
  };

  const handlePrint = () => window.print();

  const handleRevoke = async (row: ClaimTokenAdminPublic) => {
    if (!row.token) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        row.redeemed
          ? `Revoke (cleanup) redeemed token ${row.token}?`
          : `Revoke active token ${row.token}? Printed QRs stop working.`,
      )
    )
      return;
    try {
      const ok = await revoke.mutateAsync(row.token);
      if (!ok) toast.error("Revoke skipped — token was not found.");
      else toast.success("Claim token revoked.");
    } catch {
      toast.error("Failed to revoke claim token.");
    }
  };

  return (
    <div
      className="space-y-6 admin-qr-labels-root"
      data-ocid="admin-qr-labels-tab"
    >
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            .admin-qr-print-surface,
            .admin-qr-print-surface * { visibility: visible !important; }
            .admin-qr-print-surface {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .admin-qr-no-print { display: none !important; }

            /* Avery® 5160 — 30 / sheet, 2.625" × 1", 10 rows × 3 columns */
            @page { size: letter portrait; margin: 0.38in 0.19in 0.38in 0.19in; }

            .avery5160-grid {
              display: grid !important;
              grid-template-columns: repeat(3, 2.625in) !important;
              grid-auto-rows: 1in !important;
              column-gap: 0.159in !important;
              row-gap: 0 !important;
              width: calc(3 * 2.625in + 2 * 0.159in) !important;
              box-sizing: border-box !important;
              align-content: start !important;
            }

            .avery5160-cell {
              box-sizing: border-box !important;
              width: 2.625in !important;
              height: 1in !important;
              padding: 0.046in !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              gap: 0.06in !important;
              border: none !important;
              margin: 0 !important;
            }

            .avery5160-cell img {
              width: 0.822in !important;
              height: 0.822in !important;
              flex-shrink: 0 !important;
            }

            .avery5160-text {
              flex: 1 !important;
              min-width: 0 !important;
              font-family: ui-sans-serif, system-ui, sans-serif !important;
            }
          }

          @media screen {
            .avery5160-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              gap: 0.85rem;
            }
          }
        `}
      </style>

      <section
        className="admin-qr-no-print p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-qr-prepare-section"
      >
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">
            Physical QR claim labels
          </h3>
        </div>
        <p className="text-xs text-muted-foreground max-w-[56rem] leading-relaxed">
          QR encodes fixed URL{" "}
          <span className="font-mono text-[10px]">
            {CLAIM_BASE}/&lcub;spcy_*&rcub;
          </span>
          . Batch calls <span className="font-mono">generateClaimTokens</span>{" "}
          with ICRC‑7 NAT token IDs — existing QR codes are reused when{" "}
          <span className="font-mono">getPlantClaimToken</span> already returns
          text.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="space-y-1.5 xl:col-span-4">
            <Label className="text-xs">Source</Label>
            <Select
              value={source}
              onValueChange={(value) => setSource(value as LabelSource)}
            >
              <SelectTrigger data-ocid="admin-qr-source-select">
                <SelectValue placeholder="Select source…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlabeled_nft">
                  NFT plants lacking a QR claim token yet
                </SelectItem>
                <SelectItem value="tray">
                  Tray — cells tied to NFT + plant
                </SelectItem>
                <SelectItem value="comma_ids">
                  Comma‑separated plant IDs
                </SelectItem>
                <SelectItem value="for_sale">
                  All NIMS listings for sale
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source === "tray" && (
            <div className="space-y-1.5 xl:col-span-8">
              <Label className="text-xs flex flex-wrap gap-2 justify-between">
                Tray
                {parsedTray !== null ? (
                  <span className="text-muted-foreground font-normal tabular-nums">
                    Tray cells wired to NFT:&nbsp;
                    {trayCells ? trayPreviewCount : "…"}
                  </span>
                ) : null}
              </Label>
              <Select value={trayId} onValueChange={setTrayId}>
                <SelectTrigger data-ocid="admin-qr-tray-select">
                  <SelectValue placeholder="Choose tray row" />
                </SelectTrigger>
                <SelectContent>
                  {(trays as Tray[])
                    .slice()
                    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
                    .map((t) => (
                      <SelectItem key={String(t.id)} value={String(t.id)}>
                        Tray #{String(t.id)}
                        {t.name.trim().length
                          ? ` — ${t.name.slice(0, 48)}`
                          : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {source === "comma_ids" && (
            <div className="space-y-1.5 xl:col-span-8">
              <Label className="text-xs">Comma‑separated plant IDs</Label>
              <Input
                value={commaPlantIds}
                onChange={(e) => setCommaPlantIds(e.target.value)}
                placeholder="e.g. 12, 144, 5002"
                className="font-mono text-xs"
                data-ocid="admin-qr-comma-ids-input"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button
            size="sm"
            type="button"
            className="bg-primary gap-2"
            onClick={() => void handlePrepareLabels()}
            disabled={
              !actorReady ||
              !did ||
              generateBatch.isPending ||
              plantsLoading ||
              (source === "tray" && parsedTray === null)
            }
            data-ocid="admin-qr-prepare-btn"
          >
            {generateBatch.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <QrCode className="w-4 h-4" aria-hidden />
            )}
            Prepare QR labels
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            className="gap-2 h-8 text-xs border-border"
            disabled={labelRows.length === 0}
            onClick={() => handlePrint()}
            data-ocid="admin-qr-print-btn"
          >
            <Printer className="w-3.5 h-3.5" />
            Print — Avery&nbsp;5160
          </Button>

          <Badge variant="outline" className="tabular-nums text-[10px]">
            Cached plants {plantsLoading ? "…" : String(plants.length)}
          </Badge>
        </div>
      </section>

      {labelRows.length > 0 && (
        <div
          className="admin-qr-print-surface rounded-xl bg-card border border-border p-4 md:p-5"
          data-ocid="admin-qr-sheet"
        >
          <header className="admin-qr-no-print flex mb-4 justify-between">
            <h4 className="text-xs font-semibold text-foreground">
              Avery® 5160 — label preview ({labelRows.length})
            </h4>
          </header>

          <div className="avery5160-grid">
            {labelRows.map((row) => (
              <article
                key={`${String(row.plantId)}_${String(row.claimToken)}`}
                className="avery5160-cell"
              >
                <QrLabelImage claimToken={row.claimToken} />
                <div className="avery5160-text text-[11px] leading-snug md:text-[10px] print:text-[7.5pt] space-y-[1px] overflow-hidden">
                  <div className="font-semibold text-foreground line-clamp-2">
                    {row.variety}
                  </div>
                  <div className="text-muted-foreground">{`NFT #${String(row.nftTokenId)}`}</div>
                  <div className="text-muted-foreground">{row.stageLabel}</div>
                  <div className="font-mono text-[10px] text-primary truncate print:text-[6.5pt]">
                    {row.claimToken}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <section className="admin-qr-no-print p-5 rounded-xl bg-card border border-border gap-5 flex flex-col">
        <div className="flex flex-wrap gap-x-10 gap-y-4 justify-between">
          <header className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 font-display font-semibold text-sm text-foreground">
              <Search className="w-4 h-4 text-primary" />
              <span className="">Claim token inventory</span>
              <ShieldOff className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Backed by <span className="font-mono">listClaimTokensAdmin</span>;
              revoke with{" "}
              <span className="font-mono">revokeClaimTokenAdmin</span> when a
              sticker is mis‑printed or compromised.
            </p>
          </header>
          <div className="relative w-full xs:w-auto min-w-[200px] sm:min-w-[280px] grow sm:grow-0">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Substring search…"
              className="h-10 pl-8 text-xs"
              value={tokenSearchRaw}
              onChange={(e) => setTokenSearchRaw(e.target.value)}
              data-ocid="admin-qr-token-search"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {tokensLoading ? (
            [1, 2, 3, 4, 6].map((k) => (
              <Skeleton className="h-14 w-full rounded-none" key={String(k)} />
            ))
          ) : tokensList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center px-10 py-12">
              {tokenSearch.trim()
                ? `No tokens match "${tokenSearch.trim()}".`
                : "No tokens returned from the ledger."}
            </p>
          ) : (
            tokensList.map((tbl) => (
              <div
                key={tbl.token}
                className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-card"
              >
                <code className="text-[11px] text-primary truncate min-w-[10rem] max-w-[16rem] sm:max-w-xs">
                  {tbl.token}
                </code>
                <div className="flex flex-row flex-wrap items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-normal"
                  >
                    NFT&nbsp;#{String(tbl.token_id)}
                  </Badge>
                  {tbl.plant_id?.length && tbl.plant_id[0] !== undefined ? (
                    <Badge
                      variant="outline"
                      className="font-normal text-[10px]"
                    >
                      Plant&nbsp;#{String(tbl.plant_id[0])}
                    </Badge>
                  ) : (
                    ""
                  )}
                  <Badge
                    variant={tbl.redeemed ? "secondary" : "default"}
                    className="text-[10px]"
                  >
                    {tbl.redeemed ? "Redeemed" : "Active"}
                  </Badge>

                  <Button
                    variant="destructive"
                    disabled={revoke.isPending}
                    size="sm"
                    className="h-9 text-[11px] gap-2"
                    type="button"
                    onClick={() => void handleRevoke(tbl)}
                    data-ocid="admin-qr-revoke-btn"
                  >
                    {revoke.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Trash2 className="w-4 h-4 shrink-0" />
                    )}
                    Revoke
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
