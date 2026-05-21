import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@icp-sdk/core/principal";
import { Gift, Loader2, Send, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type AdminBatchAirdropRow,
  useAdminBatchAirdrop,
  useAdminTransferFromPool,
  useAuditLog,
} from "../../hooks/useAdminShop";

function parsePrincipalLines(text: string): Principal[] {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const principals: Principal[] = [];
  for (const line of lines) {
    try {
      principals.push(Principal.fromText(line));
    } catch {
      throw new Error(`Invalid principal on line: ${line.slice(0, 48)}…`);
    }
  }
  return principals;
}

function isAirdropAuditEntry(action: string, detail: string): boolean {
  const hay = `${action} ${detail}`.toLowerCase();
  return (
    hay.includes("admin_transfer") ||
    hay.includes("airdrop") ||
    hay.includes("claim")
  );
}

/** Admin: ICRC-7 pool single & batch gifting + audit excerpts. */
export function AdminBatchGiftsTab() {
  const audit = useAuditLog(0n, 200n);
  const transferOne = useAdminTransferFromPool();
  const batchAirdrop = useAdminBatchAirdrop();

  const [singleRecipient, setSingleRecipient] = useState("");
  const [singleTokenId, setSingleTokenId] = useState("");
  const [singleRandom, setSingleRandom] = useState(false);

  const [batchPrincipals, setBatchPrincipals] = useState("");
  const [batchMode, setBatchMode] = useState<"random" | "range">("random");
  const [batchStartId, setBatchStartId] = useState("");
  const [batchEndId, setBatchEndId] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastBatchRows, setLastBatchRows] = useState<
    AdminBatchAirdropRow[] | null
  >(null);

  const principalsParsed = useMemo(() => {
    try {
      if (!batchPrincipals.trim()) return [] as Principal[];
      return parsePrincipalLines(batchPrincipals);
    } catch {
      return null;
    }
  }, [batchPrincipals]);

  const rangeSpan = useMemo(() => {
    if (batchMode !== "range") return null;
    const a = batchStartId.trim() ? BigInt(batchStartId.trim()) : null;
    const b = batchEndId.trim() ? BigInt(batchEndId.trim()) : null;
    if (a === null || b === null) return null;
    if (b < a) return null;
    return Number(b - a + 1n);
  }, [batchMode, batchEndId, batchStartId]);

  const rangeInputsOk =
    batchMode !== "range" ||
    (batchStartId.trim().length > 0 &&
      batchEndId.trim().length > 0 &&
      rangeSpan !== null);

  const rangeCapacityExceeded =
    batchMode === "range" &&
    rangeSpan !== null &&
    principalsParsed !== null &&
    principalsParsed.length > rangeSpan;

  const previewInvalid =
    principalsParsed === null ||
    principalsParsed.length === 0 ||
    !rangeInputsOk ||
    rangeCapacityExceeded;

  const filteredAudit = useMemo(() => {
    const rows = audit.data ?? [];
    return rows.filter((e) => isAirdropAuditEntry(e.action, e.detail));
  }, [audit.data]);

  const handleSingleSend = async () => {
    try {
      const recipient = Principal.fromText(singleRecipient.trim());
      if (singleRandom) {
        const rows = await batchAirdrop.mutateAsync({
          recipients: [recipient],
          useRandom: true,
          startTokenId: null,
        });
        const r = rows[0];
        if (r?.success) {
          toast.success(
            `Random pool NFT #${r.token_id.toString()} sent (${r.message})`,
          );
        } else {
          toast.error(r?.message ?? "Airdrop failed");
        }
        return;
      }

      const tid = BigInt(singleTokenId.trim());
      const blockIndex = await transferOne.mutateAsync({
        tokenId: tid,
        to: recipient,
      });
      toast.success(`Transferred NFT #${tid.toString()} · block ${blockIndex}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    }
  };

  const runConfirmedBatch = async () => {
    if (previewInvalid || principalsParsed === null) return;
    try {
      const useRandom = batchMode === "random";
      const startTokenId =
        batchStartId.trim().length > 0
          ? BigInt(batchStartId.trim())
          : null;

      const rows = await batchAirdrop.mutateAsync({
        recipients: principalsParsed,
        useRandom,
        startTokenId,
      });
      setLastBatchRows(rows);
      const ok = rows.filter((r) => r.success).length;
      const fail = rows.length - ok;
      toast.success(`Batch finished: ${ok} ok, ${fail} failed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-8" data-ocid="admin-batch-gifts-tab">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">
          Batch Gifts {'&'} NFT Airdrops
        </h2>
      </div>

      {/* Single */}
      <section
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-single-airdrop"
      >
        <div>
          <h3 className="font-semibold text-sm mb-1">Single airdrop (pool)</h3>
          <p className="text-xs text-muted-foreground">
            Send one IC SPICY NFT held by the canister pool via{" "}
            <code className="text-[10px]">adminTransferFromPool</code>, or pick
            a random pool token with{" "}
            <code className="text-[10px]">adminBatchAirdrop</code> (single
            recipient).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Recipient principal</Label>
            <Input
              className="mt-1 font-mono text-xs"
              value={singleRecipient}
              onChange={(e) => setSingleRecipient(e.target.value)}
              placeholder="aaaaa-aa…"
              data-ocid="admin-single-airdrop-recipient"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs flex items-center gap-2">
              <Checkbox
                checked={singleRandom}
                onCheckedChange={(v) => setSingleRandom(!!v)}
                data-ocid="admin-single-random-checkbox"
              />
              Random from pool
            </Label>
            {!singleRandom ? (
              <div>
                <Label className="text-xs">Token ID</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={singleTokenId}
                  onChange={(e) => setSingleTokenId(e.target.value)}
                  placeholder="e.g. 42"
                  data-ocid="admin-single-token-id"
                />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Picks the next eligible pool-held token using the canister&apos;s
                random selection path.
              </p>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          className="gap-2"
          disabled={
            !singleRecipient.trim() ||
            transferOne.isPending ||
            batchAirdrop.isPending ||
            (!singleRandom && !singleTokenId.trim())
          }
          onClick={() => void handleSingleSend()}
          data-ocid="admin-single-send-btn"
        >
          {transferOne.isPending || batchAirdrop.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send
        </Button>
      </section>

      {/* Batch */}
      <section
        className="p-5 rounded-xl bg-card border border-border space-y-4"
        data-ocid="admin-batch-airdrop"
      >
        <div className="flex items-start gap-3">
          <Shuffle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm mb-1">Batch airdrop</h3>
            <p className="text-xs text-muted-foreground">
              One IC principal per line. Uses{" "}
              <code className="text-[10px]">adminBatchAirdrop(recipients,</code>
              <code className="text-[10px]"> useRandom, startTokenId)</code>.
            </p>
          </div>
        </div>

        <RadioGroup
          value={batchMode}
          onValueChange={(v) => setBatchMode(v as "random" | "range")}
          className="flex flex-col gap-2"
          data-ocid="admin-batch-mode"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="random" id="batch-random" />
            <Label htmlFor="batch-random" className="text-xs cursor-pointer">
              Random from pool
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="range" id="batch-range" />
            <Label htmlFor="batch-range" className="text-xs cursor-pointer">
              Sequential from token ID range (start → end preview)
            </Label>
          </div>
        </RadioGroup>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {batchMode === "range" && (
            <>
              <div>
                <Label className="text-xs">Start token ID</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={batchStartId}
                  onChange={(e) => setBatchStartId(e.target.value)}
                  placeholder="first ID to scan"
                />
              </div>
              <div>
                <Label className="text-xs">
                  End token ID (preview / capacity only)
                </Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={batchEndId}
                  onChange={(e) => setBatchEndId(e.target.value)}
                  placeholder="warn if recipients exceed range"
                />
              </div>
            </>
          )}
          {batchMode === "random" && (
            <div>
              <Label className="text-xs">Optional scan start token ID</Label>
              <Input
                className="mt-1 font-mono text-xs"
                value={batchStartId}
                onChange={(e) => setBatchStartId(e.target.value)}
                placeholder="defaults to backend cursor (typically 1)"
              />
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs mb-2 block">
            Recipients ({principalsParsed?.length ?? 0} principals)
          </Label>
          <Textarea
            className="min-h-[140px] font-mono text-xs"
            value={batchPrincipals}
            onChange={(e) => setBatchPrincipals(e.target.value)}
            placeholder={"aaaaa-aa\nbbbbbb-bb"}
            data-ocid="admin-batch-principals"
          />
        </div>

        {batchPrincipals.trim().length > 0 &&
          principalsParsed === null && (
          <p className="text-xs text-destructive">
            Invalid principal syntax on one or more lines.
          </p>
        )}
        {batchPrincipals.trim().length > 0 &&
          principalsParsed !== null &&
          previewInvalid && (
            <p className="text-xs text-destructive">
              {batchMode === "range" &&
              principalsParsed !== null &&
              rangeSpan !== null &&
              principalsParsed.length > rangeSpan
                ? `Too many principals (${principalsParsed.length}) for range span ${rangeSpan}.`
                : principalsParsed?.length === 0
                  ? "Add at least one principal."
                  : !rangeInputsOk
                    ? `Sequential mode: enter inclusive start/end token IDs. End minus start + 1 must be greater than or equal to the recipient line count (${principalsParsed?.length ?? 0}).`
                    : ""}
            </p>
          )}

        {batchAirdrop.isPending && <Progress value={66} className="h-1.5" />}

        <Button
          type="button"
          disabled={previewInvalid}
          variant="destructive"
          className="gap-2"
          onClick={() => setConfirmOpen(true)}
          data-ocid="admin-batch-execute-open"
        >
          Execute batch…
        </Button>

        {lastBatchRows && lastBatchRows.length > 0 && (
          <div
            className="rounded-xl border border-border overflow-hidden mt-4"
            data-ocid="admin-batch-results"
          >
            <div className="px-4 py-2 bg-muted/30 text-xs font-medium">
              Last batch results ({lastBatchRows.length} rows)
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Recipient</TableHead>
                  <TableHead className="text-xs">Token</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastBatchRows.map((row, i) => (
                  <TableRow key={`${row.recipient.toText()}-${i}`}>
                    <TableCell className="font-mono text-[10px] max-w-[180px] break-all">
                      {row.recipient.toText()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.token_id.toString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.success ? "outline" : "destructive"}>
                        {row.success ? "OK" : "FAIL"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-ocid="admin-batch-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm batch airdrop</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                You are about to send{" "}
                <strong>{principalsParsed?.length ?? 0}</strong> pool NFT(s) to
                distinct principals (
                <strong>{batchMode === "random" ? "random" : "sequential"}</strong>
                ).
              </p>
              {batchMode === "range" && (
                <p>
                  Token range preview: IDs {batchStartId || "?"} —
                  {batchEndId || "?"}{" "}
                  {rangeSpan !== null ? `(${rangeSpan} slots)` : ""}
                </p>
              )}
              <p>This cannot be undone from the UI. Continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchAirdrop.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void runConfirmedBatch();
              }}
              disabled={batchAirdrop.isPending || previewInvalid}
            >
              {batchAirdrop.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : (
                "Confirm execute"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recent audit */}
      <section className="space-y-3" data-ocid="admin-airdrop-audit-preview">
        <h3 className="text-sm font-semibold">
          Recent airdrops (audit log excerpt)
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Client-side filter on <code className="text-[10px]">getAuditLog</code>
          ; actions/details containing{" "}
          <code className="text-[10px]">admin_transfer</code>,{" "}
          <code className="text-[10px]">airdrop</code>, or{" "}
          <code className="text-[10px]">claim</code>.
        </p>
        {audit.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <Skeleton key={k} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredAudit.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border">
            No matching audit entries yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden max-h-[320px] overflow-y-auto">
            {filteredAudit.map((entry, i) => (
              <div
                key={`${entry.ts.toString()}-${i}`}
                className="px-4 py-3 bg-card space-y-1"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {entry.action}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(Number(entry.ts) / 1_000_000).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {entry.detail}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/80">
                  admin: {entry.admin.toText()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gift pack creator placeholder */}
      <section
        className="p-10 rounded-xl border border-dashed border-border bg-muted/10 text-center space-y-2"
        data-ocid="admin-gift-pack-creator-placeholder"
      >
        <Gift className="w-10 h-10 mx-auto opacity-40" />
        <h3 className="font-semibold text-foreground">
          Gift Pack Creator · coming soon
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Multi-plant bundled claim flows will land here alongside pool
          airdrops.
        </p>
      </section>
    </div>
  );
}
