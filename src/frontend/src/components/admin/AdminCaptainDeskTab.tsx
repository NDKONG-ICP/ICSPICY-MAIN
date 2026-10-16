import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatTokenAmount,
  useTokenBalancesForPrincipal,
} from "@/hooks/useTokenBalances";
import { CAPTAIN_PRINCIPAL } from "@/lib/capsaicin-portfolio";
import {
  fetchCaptainHederaInfo,
  fetchHederaAccountSummary,
  fetchHederaTokenBalances,
  fetchHederaTransactions,
  fetchSentxCollectionTracked,
  hashscanAccountUrl,
  hashscanTokenUrl,
  type HederaTokenBalance,
  type HederaTxRow,
} from "@/lib/hedera";
import { Principal } from "@dfinity/principal";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const HTS = import.meta.env.VITE_HEDERA_DROP_TOKEN_ID?.trim() || "0.0.10910756";
const OPS_ACCOUNT = "0.0.10910751";

type DeskSlot = {
  slot?: number;
  label?: string;
  at?: string;
};

type DeskCheck = { name: string; pass: boolean; detail: string };

type DeskEntry = {
  at: string;
  decision: string;
  reason: string;
  execute: boolean;
  order: {
    action: string;
    sleeve: string;
    venue: string | null;
    instrument: string | null;
    leverage: number;
  };
  checks: DeskCheck[];
};

type DeskSnapshot = {
  updatedAt: string;
  mode: string;
  profitTargetUsd: number;
  profitTargetNote: string;
  agentAccounts: {
    status: string;
    mainnet: string;
    url: string;
    note: string;
  };
  posts: {
    dateET: string;
    slotsPerDay: number;
    slotsPosted: number;
    labels: string[];
    slots: DeskSlot[];
    platforms: string[];
    image: string;
  };
  spend: {
    month: string;
    spentHbar: number;
    spentIcp: number;
    caps: { hbar: number; icp: number };
  };
  allocation: {
    retirement: Array<{ bucket: string; targetPct: number }>;
    stockAllowlist: string[];
    venueAllowlist: string[];
  };
  blotter: DeskEntry[];
  venues?: Array<{
    id: string;
    name: string;
    url: string;
    chain: string;
    mode: string;
    spends: boolean;
    summary: string;
    reachable: boolean | null;
    detail: string;
    quotes?: Array<{ symbol: string; priceUsd: string | null }>;
  }>;
  collections?: Array<{
    name: string;
    tokenId: string;
    floor?: number;
    budgetHbar?: number;
    aboveBudget?: boolean;
    marketplaceUrl?: string;
    error?: string;
  }>;
};

async function fetchDesk(): Promise<DeskSnapshot | null> {
  const base = import.meta.env.PROD
    ? window.location.origin
    : "https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io";
  try {
    const res = await fetch(`${base}/captain-ops/desk.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as DeskSnapshot;
  } catch {
    return null;
  }
}

export function AdminCaptainDeskTab() {
  const captain = Principal.fromText(CAPTAIN_PRINCIPAL);
  const balances = useTokenBalancesForPrincipal(captain);
  const [desk, setDesk] = useState<DeskSnapshot | null>(null);
  const [accountId, setAccountId] = useState(OPS_ACCOUNT);
  const [hbar, setHbar] = useState<number | null>(null);
  const [tokens, setTokens] = useState<HederaTokenBalance[]>([]);
  const [txs, setTxs] = useState<HederaTxRow[]>([]);
  const [sentx, setSentx] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [snapshot, info, tracked] = await Promise.all([
      fetchDesk(),
      fetchCaptainHederaInfo(),
      fetchSentxCollectionTracked(HTS),
    ]);
    const id = info?.accountId || OPS_ACCOUNT;
    const [summary, tokenRows, txRows] = await Promise.all([
      fetchHederaAccountSummary(id),
      fetchHederaTokenBalances(id),
      fetchHederaTransactions(id, 12),
    ]);
    setDesk(snapshot);
    setAccountId(id);
    setHbar(summary?.balanceHbar ?? null);
    setTokens(tokenRows);
    setTxs(txRows);
    setSentx(tracked.detail);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Paper mode. Captain can propose buy, sell, hold, or stake. Live
            orders stay off until a Hedera Agent Account enforces the rules and
            the dry-powder sleeve is funded through the treasury timelock.
          </p>
          <p className="text-xs text-muted-foreground">
            Three posts a day, each with a MiniRouter image, go to Community,
            Crumbeatr, and SWOP when the worker is running.{" "}
            <a
              className="underline"
              href="https://hedera.com/blog/introducing-hedera-agent-accounts/"
              target="_blank"
              rel="noreferrer"
            >
              Agent Accounts
            </a>{" "}
            target mainnet in Q2 2027.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly profit target</CardDescription>
            <CardTitle>$1,200</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {desk?.profitTargetNote ??
              "Dry-powder target only. Retirement holdings are not spent to reach it."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Posts today (ET)</CardDescription>
            <CardTitle>
              {desk ? `${desk.posts.slotsPosted} / ${desk.posts.slotsPerDay}` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {desk
              ? desk.posts.slots.map((s) => s.label).filter(Boolean).join(", ") ||
                "No slots recorded on the worker yet"
              : "Desk snapshot not published yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SentX {HTS}</CardDescription>
            <CardTitle className="text-base">{sentx || "…"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <a className="underline" href={hashscanTokenUrl(HTS)} target="_blank" rel="noreferrer">
              Hashscan collection
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ICP holdings</CardTitle>
            <CardDescription className="font-mono text-xs break-all">
              {CAPTAIN_PRINCIPAL}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {balances.isLoading ? (
              <p className="text-muted-foreground">Loading ledgers…</p>
            ) : (
              balances.data?.map((row) => (
                <div key={row.symbol} className="flex justify-between gap-3">
                  <span>{row.symbol}</span>
                  <span className="font-mono">
                    {formatTokenAmount(row.balance, row.decimals)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hedera holdings</CardTitle>
            <CardDescription>
              <a className="underline font-mono" href={hashscanAccountUrl(accountId)} target="_blank" rel="noreferrer">
                {accountId}
              </a>
              {hbar != null ? ` · ${hbar.toFixed(2)} HBAR` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1 max-h-64 overflow-auto">
            {tokens.length === 0 ? (
              <p className="text-muted-foreground">No associated tokens on this account.</p>
            ) : (
              tokens.map((t) => (
                <div key={t.tokenId} className="flex justify-between gap-3">
                  <a className="underline" href={hashscanTokenUrl(t.tokenId)} target="_blank" rel="noreferrer">
                    {t.symbol} · {t.name}
                  </a>
                  <span className="font-mono shrink-0">
                    {t.balance}
                    {t.decimals === 0 ? " serials" : ""}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sleeves</CardTitle>
          <CardDescription>
            Ops cap {desk ? `${desk.spend.spentHbar.toFixed(2)} / ${desk.spend.caps.hbar} HBAR` : "1000 HBAR"}
            {" and "}
            {desk ? `${desk.spend.spentIcp.toFixed(2)} / ${desk.spend.caps.icp} ICP` : "20 ICP"} this month.
            Venue allowlist and stock allowlist are empty, so every trade rejects.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <div className="font-medium">Retirement</div>
            <p className="text-muted-foreground text-xs">Hold and stake only the marked slice. No leverage.</p>
            <ul className="mt-2 text-xs space-y-1">
              {(desk?.allocation.retirement ?? [
                { bucket: "cash or stables", targetPct: 40 },
                { bucket: "ICP and HBAR", targetPct: 25 },
                { bucket: "NFT inventory", targetPct: 20 },
                { bucket: "tokenized stocks after allowlist", targetPct: 15 },
              ]).map((b) => (
                <li key={b.bucket}>
                  {b.targetPct}% {b.bucket}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium">Dry powder</div>
            <p className="text-muted-foreground text-xs">
              Max 2×, stop required, 1% daily loss halt. Paper only.
            </p>
          </div>
          <div>
            <div className="font-medium">Ops</div>
            <p className="text-muted-foreground text-xs">
              Images and posts. Does not trade. {desk?.posts.image}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Venues</CardTitle>
          <CardDescription>
            Watched on a schedule. The trade allowlist stays empty, so none of these can buy, sell, or stake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(desk?.venues ?? []).length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Venue status publishes with the desk snapshot.
            </p>
          ) : (
            desk?.venues?.map((venue) => (
              <div key={venue.id} className="border-b border-border pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a className="font-medium underline" href={venue.url} target="_blank" rel="noreferrer">
                    {venue.name}
                  </a>
                  <Badge variant="secondary">{venue.mode}</Badge>
                  <span className="text-xs text-muted-foreground">{venue.detail}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{venue.summary}</p>
                {venue.quotes && venue.quotes.length > 0 ? (
                  <p className="text-xs font-mono mt-1">
                    {venue.quotes
                      .map((q) =>
                        q.priceUsd
                          ? `${q.symbol} $${Number(q.priceUsd).toFixed(q.symbol === "ICP" ? 2 : 0)}`
                          : `${q.symbol} —`,
                      )
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hedera collections</CardTitle>
          <CardDescription>
            SentX floors against a 100 HBAR budget. No buy is sent from the drop treasury.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(desk?.collections ?? []).length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Collection floors publish with the desk snapshot.
            </p>
          ) : (
            desk?.collections?.map((col) => (
              <div key={col.tokenId} className="flex justify-between gap-3 border-b pb-2">
                <a className="underline" href={col.marketplaceUrl} target="_blank" rel="noreferrer">
                  {col.name}
                </a>
                <span className="font-mono text-xs">
                  {col.error
                    ? col.error
                    : `${col.floor ?? "—"} HBAR · budget ${col.budgetHbar ?? 100}`}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Policy blotter</CardTitle>
          <CardDescription>Every row has execute=false.</CardDescription>
        </CardHeader>
        <CardContent className="text-xs font-mono space-y-2 max-h-80 overflow-auto">
          {!desk || desk.blotter.length === 0 ? (
            <p className="font-sans text-muted-foreground">
              No blotter published yet. Run publish-captain-ops.js with the frontend deploy.
            </p>
          ) : (
            desk.blotter.map((e, i) => (
              <div key={`${e.at}-${i}`} className="border-b border-border pb-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant={e.decision === "reject" ? "destructive" : "secondary"}>
                    {e.decision}
                  </Badge>
                  <span>
                    {e.order.action} · {e.order.sleeve}
                    {e.order.venue ? ` · ${e.order.venue}` : ""}
                  </span>
                </div>
                <div className="text-muted-foreground">{e.reason}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Hedera activity</CardTitle>
        </CardHeader>
        <CardContent className="text-xs font-mono space-y-1 max-h-64 overflow-auto">
          {txs.map((t) => (
            <div key={t.transactionId}>
              {t.consensusAt} · {t.name} · {t.result} · {t.netHbar.toFixed(2)} HBAR
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
