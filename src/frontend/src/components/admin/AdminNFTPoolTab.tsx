import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  Icrc7TokenAdminPublic,
  Icrc7TokenFilter,
} from "../../declarations/backend.did";

import {
  useAdminReturnToPool,
  useAdminTransferFromPool,
  useIcrc7PoolStatsAdmin,
  useIcrc7PoolTokensAdmin,
} from "../../hooks/useAdminShop";
import { exportNftPoolCsv } from "../../lib/nims-export-mappers";

const PAGE_SIZE = 50n;
const MAX_SCAN = 8888n;

const STATS_SKELETON_KEYS = [
  "stats-skel-a",
  "stats-skel-b",
  "stats-skel-c",
  "stats-skel-d",
  "stats-skel-e",
  "stats-skel-f",
  "stats-skel-g",
  "stats-skel-h",
  "stats-skel-i",
] as const satisfies readonly string[];

const TABLE_ROW_SKELETON_KEYS = [
  "row-skel-a",
  "row-skel-b",
  "row-skel-c",
  "row-skel-d",
  "row-skel-e",
  "row-skel-f",
  "row-skel-g",
  "row-skel-h",
] as const satisfies readonly string[];

const FILTER_OPTIONS: ReadonlyArray<{
  value: keyof Icrc7TokenFilterVariantMap;
  label: string;
  filter: Icrc7TokenFilter;
}> = [
  { value: "All", label: "All", filter: { All: null } },
  { value: "Available", label: "Available", filter: { Available: null } },
  { value: "Assigned", label: "Assigned", filter: { Assigned: null } },
  { value: "Sold", label: "Sold", filter: { Sold: null } },
  { value: "PepperHead", label: "PepperHead", filter: { PepperHead: null } },
  { value: "Missing", label: "Missing", filter: { Missing: null } },
];

/** Keys only — values are phantom for typing `keyof`. */
interface Icrc7TokenFilterVariantMap {
  All: null;
  Available: null;
  Assigned: null;
  Sold: null;
  PepperHead: null;
  Missing: null;
}

function firstOpt<T>(v: [] | [T]): T | undefined {
  return v[0];
}

function formatAssignment(token: Icrc7TokenAdminPublic): string {
  const plantId = firstOpt(token.plant_id);
  const productId = firstOpt(token.product_id);
  const parts: string[] = [];
  if (plantId !== undefined) parts.push(`Plant #${plantId.toString()}`);
  if (productId !== undefined) parts.push(`Product #${productId.toString()}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function parseTokenIdSearch(raw: string): bigint | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (!/^\d+$/.test(trimmed)) return undefined;
  try {
    const n = BigInt(trimmed);
    if (n < 1n || n > MAX_SCAN) return undefined;
    return n;
  } catch {
    return undefined;
  }
}

function parseRecipientPrincipal(raw: string): Principal {
  try {
    return Principal.fromText(raw.trim());
  } catch {
    throw new Error("Invalid recipient principal — check the text ID.");
  }
}

export function AdminNFTPoolTab() {
  const [filterSel, setFilterSel] =
    useState<keyof Icrc7TokenFilterVariantMap>("All");
  const activeFilter =
    FILTER_OPTIONS.find((o) => o.value === filterSel)?.filter ??
    ({ All: null } as const);

  const [searchRaw, setSearchRaw] = useState("");
  const searchId = useMemo(() => parseTokenIdSearch(searchRaw), [searchRaw]);
  const isSearchActive = searchId !== undefined;

  const [page, setPage] = useState(0);

  const offset = isSearchActive ? 0n : BigInt(page) * PAGE_SIZE;
  const limit = isSearchActive ? MAX_SCAN : PAGE_SIZE;

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useIcrc7PoolStatsAdmin();
  const {
    data: pageRows,
    isLoading: rowsLoading,
    isFetching,
    refetch: refetchRows,
    error,
  } = useIcrc7PoolTokensAdmin(activeFilter, offset, limit);

  const transfer = useAdminTransferFromPool();
  const sendBack = useAdminReturnToPool();

  const [recipientText, setRecipientText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const displayRows = useMemo(() => {
    if (!pageRows) return [];
    if (searchId === undefined) return pageRows;
    return pageRows.filter((r) => r.token_id === searchId);
  }, [pageRows, searchId]);

  const loadMoreAvail =
    !isSearchActive &&
    !!pageRows &&
    pageRows.length === Number(PAGE_SIZE) &&
    !rowsLoading &&
    !isFetching;

  const changeFilter = (v: keyof Icrc7TokenFilterVariantMap) => {
    setFilterSel(v);
    setPage(0);
    setSelectedIds(new Set());
  };

  const handleRecipientBatchTransfer = async (idsOverride?: bigint[]) => {
    const idsFromSelection = [...selectedIds]
      .map((s) => BigInt(s))
      .filter((tid) =>
        displayRows.some((r) => r.token_id === tid && r.is_canister_pool),
      );
    const targetIds =
      idsOverride !== undefined ? idsOverride : idsFromSelection;

    if (targetIds.length === 0) {
      toast.error(
        idsOverride?.length === 1
          ? "This token is not held in the canister pool."
          : "Select at least one token that is in the canister pool.",
      );
      return;
    }

    let recipient: Principal;
    try {
      recipient = parseRecipientPrincipal(recipientText);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid principal");
      return;
    }

    let okCount = 0;
    const failures: string[] = [];

    if (targetIds.length === 1) {
      try {
        const tid = targetIds[0]!;
        const { blockIndex } = await transfer.mutateAsync({
          tokenId: tid,
          to: recipient,
        });
        toast.success(
          `#${tid.toString()} → wallet (block ${blockIndex.toString()})`,
        );
        okCount = 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Transfer failed";
        toast.error(`#${targetIds[0]!.toString()}: ${msg}`);
      }
    } else {
      for (const tid of targetIds) {
        try {
          await transfer.mutateAsync({
            tokenId: tid,
            to: recipient,
          });
          okCount += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Transfer failed";
          failures.push(`#${tid.toString()} — ${msg}`);
        }
      }
      toast.message(
        `Batch transfers complete: ${okCount.toString()} succeeded, ${failures.length.toString()} failed.`,
        failures.length
          ? { description: failures.slice(0, 5).join("\n") }
          : undefined,
      );
    }

    if (idsOverride === undefined) setSelectedIds(new Set());
    await refetchStats();
    await refetchRows();
  };

  const handleReturnOne = async (tid: bigint) => {
    const row = displayRows.find((r) => r.token_id === tid);
    if (row?.is_canister_pool) {
      toast.error("Already in pool");
      return;
    }
    try {
      const block = await sendBack.mutateAsync({ tokenId: tid });
      toast.success(
        `#${tid.toString()} returned to pool (block ${block.toString()})`,
      );
      await refetchStats();
      await refetchRows();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Return failed";
      toast.error(raw);
    }
  };

  const toggleSelectRow = (tid: bigint, checked: boolean) => {
    const key = tid.toString();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const selectAllTransferablePage = () => {
    const next = new Set(selectedIds);
    let added = false;
    for (const row of displayRows) {
      if (row.is_canister_pool) {
        next.add(row.token_id.toString());
        added = true;
      }
    }
    if (!added && displayRows.length > 0) {
      toast.message("None of the tokens on this page are in pool.");
      return;
    }
    setSelectedIds(next);
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-6" data-ocid="admin-icrc7-pool-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            ICRC-7 pool (8888)
          </h2>
          <p className="text-xs text-muted-foreground max-w-xl">
            Collection ledger hosted on backend canister pool account. Only
            pool-held rows respond to Transfer; Return pulls non-pool ownership
            back for operations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={displayRows.length === 0}
            onClick={() => {
              exportNftPoolCsv(displayRows);
              toast.success("NFT pool CSV downloaded");
            }}
          >
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              refetchStats();
              refetchRows();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading || !stats
          ? STATS_SKELETON_KEYS.map((k) => (
              <Skeleton key={k} className="h-20 rounded-xl" />
            ))
          : [
              { label: "Total", value: stats.total },
              { label: "In canister pool", value: stats.in_canister_pool },
              { label: "Assigned to plants", value: stats.assigned_to_plants },
              {
                label: "Assigned to products",
                value: stats.assigned_to_products,
              },
              {
                label: "Sold (non-pool owners)",
                value: stats.sold_to_customers,
              },
              { label: "PepperHead total", value: stats.pepperhead_total },
              { label: "PepperHead in pool", value: stats.pepperhead_in_pool },
              {
                label: "PepperHead sold / non-pool",
                value: stats.pepperhead_sold,
              },
              { label: "Missing owner maps", value: stats.missing_owner },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                data-ocid={`icrc7-stat-${row.label.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </p>
                <p className="text-xl font-mono font-semibold text-foreground">
                  {row.value.toString()}
                </p>
              </div>
            ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={filterSel === opt.value ? "default" : "outline"}
              className="text-xs"
              onClick={() => changeFilter(opt.value)}
              data-ocid={`icrc7-filter-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-1">
            <Label className="text-xs text-muted-foreground">
              Search token ID
            </Label>
            <Input
              value={searchRaw}
              onChange={(e) => {
                setSearchRaw(e.target.value);
                setPage(0);
                setSelectedIds(new Set());
              }}
              placeholder="e.g. 42"
              className="font-mono"
              inputMode="numeric"
              data-ocid="icrc7-token-search"
            />
            {!isSearchActive && searchRaw.trim().length > 0 ? (
              <p className="text-[11px] text-destructive">
                Enter a numeric ID between 1 and 8888.
              </p>
            ) : null}
            {isSearchActive ? (
              <p className="text-[11px] text-muted-foreground">
                Showing matches for #{searchId.toString()} in the current
                filter.
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Recipient principal (batch transfer)
            </Label>
            <Input
              value={recipientText}
              onChange={(e) => setRecipientText(e.target.value)}
              placeholder="aaaaa-aa…"
              className="font-mono text-xs"
              data-ocid="icrc7-batch-recipient"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1"
                disabled={transfer.isPending}
                onClick={() => handleRecipientBatchTransfer()}
                data-ocid="icrc7-batch-transfer"
              >
                {transfer.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Transfer selected ({selectedIds.size})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={selectAllTransferablePage}
                data-ocid="icrc7-select-transferable-page"
              >
                Select transferable on page
              </Button>
            </div>
          </div>
        </div>

        {!isSearchActive ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Page {(page + 1).toString()}
              {`, ${PAGE_SIZE.toString()} tokens per page`}
              {loadMoreAvail ? " · Next may have more tokens" : ""}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === 0 || rowsLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                data-ocid="icrc7-page-prev"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={rowsLoading || !loadMoreAvail}
                onClick={() => setPage((p) => p + 1)}
                data-ocid="icrc7-page-next"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Table */}
      {error ? (
        <p className="text-sm text-destructive">
          {String((error as Error).message ?? error)}
        </p>
      ) : null}

      <div className="rounded-xl border border-border overflow-x-auto bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="p-3 w-10" />
              <th className="p-3">ID</th>
              <th className="p-3">Rarity</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Assignment</th>
              <th className="p-3">View</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rowsLoading && !displayRows.length) ||
            (!pageRows?.length && isFetching && !displayRows.length)
              ? TABLE_ROW_SKELETON_KEYS.map((k) => (
                  <tr key={k}>
                    <td colSpan={7} className="p-0">
                      <Skeleton className="h-10 rounded-none my-px" />
                    </td>
                  </tr>
                ))
              : displayRows.length === 0
                ? [
                    <tr key="empty">
                      <td
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No tokens in this slice (try adjusting filter or
                        paging).
                      </td>
                    </tr>,
                  ]
                : displayRows.map((row) => {
                    const transferable = row.is_canister_pool;
                    return (
                      <tr
                        key={row.token_id.toString()}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                        data-ocid={`icrc7-token-row-${row.token_id}`}
                      >
                        <td className="p-2 pl-3 align-middle">
                          <Checkbox
                            checked={selectedIds.has(row.token_id.toString())}
                            disabled={transfer.isPending || !transferable}
                            aria-label={`Select NFT ${row.token_id.toString()}`}
                            onCheckedChange={(c) =>
                              toggleSelectRow(
                                row.token_id,
                                c === true || c === "indeterminate",
                              )
                            }
                          />
                        </td>
                        <td className="p-3 font-mono font-medium">
                          {row.token_id.toString()}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {row.rarity_label}
                            {row.is_pepperhead ? " · PepperHead" : ""}
                          </Badge>
                        </td>
                        <td className="p-3 max-w-[220px]">
                          <div className="flex items-start gap-1">
                            <span
                              className="font-mono truncate"
                              title={row.owner}
                            >
                              {row.owner === "Canister Pool"
                                ? "Pool"
                                : row.owner}
                            </span>
                            {row.owner !== "Missing" &&
                            row.owner !== "Canister Pool" &&
                            row.owner.length > 12 ? (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Copy owner"
                                onClick={() => copyText("Principal", row.owner)}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {formatAssignment(row)}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            asChild
                          >
                            <Link
                              to="/nft/$tokenId"
                              params={{
                                tokenId: row.token_id.toString(),
                              }}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                              <ExternalLink className="w-3 h-3 ml-1 inline" />
                            </Link>
                          </Button>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 mr-1"
                            disabled={
                              transfer.isPending ||
                              row.owner === "Missing" ||
                              !row.is_canister_pool
                            }
                            onClick={() =>
                              handleRecipientBatchTransfer([row.token_id])
                            }
                            data-ocid={`icrc7-quick-transfer-${row.token_id}`}
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Transfer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            disabled={
                              sendBack.isPending ||
                              row.owner === "Missing" ||
                              row.is_canister_pool
                            }
                            onClick={() => handleReturnOne(row.token_id)}
                            data-ocid={`icrc7-quick-return-${row.token_id}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Return
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
