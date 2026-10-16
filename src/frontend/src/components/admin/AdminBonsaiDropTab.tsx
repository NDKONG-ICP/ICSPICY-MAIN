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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BAZAAR_URL,
  BONSAI_COLLECTION_ID,
  CAPTAIN_PRINCIPAL,
  type BonsaiActivityItem,
  type BonsaiDropManifest,
  type BonsaiListing,
  bazaarTokenUrl,
  e8sToIcp,
  fetchBonsaiActivity,
  fetchBonsaiCollectionStats,
  fetchBonsaiDropManifest,
  fetchBonsaiListings,
  fetchCaptainIcpBalanceE8s,
  fetchHederaTokenNfts,
  fetchTokenOwners,
} from "@/lib/bonsai";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CaptainHederaInfo,
  type HederaAccountSummary,
  type HederaTxRow,
  type SentxListingRow,
  type SentxSaleRow,
  SENTX_URL,
  fetchCaptainHederaInfo,
  fetchHederaAccountSummary,
  fetchHederaTransactions,
  fetchSentxListings,
  fetchSentxSales,
  hashscanAccountUrl,
  hashscanTokenUrl,
  sentxConfigured,
} from "@/lib/hedera";
import { useHederaWallet } from "@/providers/HederaWalletProvider";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HederaTwinClaimCard } from "@/components/HederaTwinClaimCard";

const HEDERA_TOKEN_ID = import.meta.env.VITE_HEDERA_DROP_TOKEN_ID?.trim() ?? "";

function shortPrincipal(p: string) {
  if (p.length <= 12) return p;
  return `${p.slice(0, 5)}…${p.slice(-5)}`;
}

function formatTsNs(ns: bigint) {
  const ms = Number(ns / 1_000_000n);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString();
}

type TokenRow = {
  tokenId: number;
  rarity: string;
  owner: string;
  listingId: number | null;
  listed: boolean;
  sold: boolean;
};

function DropKpis({
  manifest,
  listings,
  sales,
  captainIcp,
  stats,
}: {
  manifest: BonsaiDropManifest | null;
  listings: BonsaiListing[];
  sales: BonsaiActivityItem[];
  captainIcp: bigint;
  stats: Awaited<ReturnType<typeof fetchBonsaiCollectionStats>>;
}) {
  const dropSet = new Set(manifest?.tokenIds ?? []);
  const captainListings = listings.filter(
    (l) =>
      l.active &&
      l.seller.toText() === CAPTAIN_PRINCIPAL &&
      dropSet.has(Number(l.tokenId)),
  );
  const soldIds = new Set(
    sales
      .filter((s) => s.kind === "Sale" && s.tokenId != null)
      .map((s) => Number(s.tokenId)),
  );
  const gross = sales
    .filter((s) => s.kind === "Sale" && s.priceE8s != null)
    .reduce((a, s) => a + (s.priceE8s ?? 0n), 0n);
  const royaltyBps = stats?.royaltyBps ?? 500n;
  const net = gross - (gross * royaltyBps) / 10_000n;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Drop listed (Captain)</CardDescription>
          <CardTitle className="text-2xl">{captainListings.length}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          of {manifest?.tokenIds.length ?? 888} in manifest
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Sales (indexer)</CardDescription>
          <CardTitle className="text-2xl">{soldIds.size}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          gross {e8sToIcp(gross).toFixed(2)} ICP · net ~{e8sToIcp(net).toFixed(2)} ICP
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Collection floor</CardDescription>
          <CardTitle className="text-2xl">
            {stats ? e8sToIcp(stats.floorPriceE8s).toFixed(2) : "—"} ICP
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          listed on registry: {stats ? String(stats.listedCount) : "—"}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Captain ICP balance</CardDescription>
          <CardTitle className="text-2xl">{e8sToIcp(captainIcp).toFixed(3)}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground font-mono">
          {shortPrincipal(CAPTAIN_PRINCIPAL)}
        </CardContent>
      </Card>
    </div>
  );
}

function BonsaiDropPanel() {
  const [loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState<BonsaiDropManifest | null>(null);
  const [listings, setListings] = useState<BonsaiListing[]>([]);
  const [activity, setActivity] = useState<BonsaiActivityItem[]>([]);
  const [owners, setOwners] = useState<Map<number, string>>(new Map());
  const [captainIcp, setCaptainIcp] = useState<bigint>(0n);
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof fetchBonsaiCollectionStats>
  > | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l, a, s, bal] = await Promise.all([
        fetchBonsaiDropManifest(),
        fetchBonsaiListings(),
        fetchBonsaiActivity(800),
        fetchBonsaiCollectionStats(),
        fetchCaptainIcpBalanceE8s(),
      ]);
      setManifest(m);
      setListings(l);
      setActivity(a);
      setStats(s);
      setCaptainIcp(bal);
      if (m?.tokenIds?.length) {
        setOwners(await fetchTokenOwners(m.tokenIds));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const sales = useMemo(
    () => activity.filter((x) => x.kind === "Sale"),
    [activity],
  );

  const tokenRows: TokenRow[] = useMemo(() => {
    if (!manifest) return [];
    const listingByToken = new Map<number, BonsaiListing>();
    for (const l of listings) {
      if (l.active) listingByToken.set(Number(l.tokenId), l);
    }
    const sold = new Set(
      sales.filter((s) => s.tokenId != null).map((s) => Number(s.tokenId)),
    );
    return manifest.tokenIds.map((tokenId) => {
      const l = listingByToken.get(tokenId);
      const owner = owners.get(tokenId) ?? "—";
      return {
        tokenId,
        rarity: manifest.rarity[String(tokenId)] ?? "Unknown",
        owner,
        listingId: l ? Number(l.id) : null,
        listed: Boolean(l),
        sold: sold.has(tokenId) || owner !== CAPTAIN_PRINCIPAL,
      };
    });
  }, [manifest, listings, owners, sales]);

  const holderCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of tokenRows) {
      if (row.owner === "—") continue;
      m.set(row.owner, (m.get(row.owner) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [tokenRows]);

  const raritySold = useMemo(() => {
    const counts: Record<string, { sold: number; total: number }> = {};
    for (const row of tokenRows) {
      const r = row.rarity;
      counts[r] = counts[r] ?? { sold: 0, total: 0 };
      counts[r].total += 1;
      if (row.sold) counts[r].sold += 1;
    }
    return counts;
  }, [tokenRows]);

  if (loading && !manifest) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading Bonsai drop…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Bonsai 888 drop</h3>
          <p className="text-sm text-muted-foreground">
            Collection {BONSAI_COLLECTION_ID} · 1.2 ICP listings · manifest seed{" "}
            {manifest?.seedHash ? `${manifest.seedHash.slice(0, 12)}…` : "not published"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={BAZAAR_URL} target="_blank" rel="noreferrer">
              Bazaar <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {!manifest && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No manifest at <code>/bonsai-drop/manifest.json</code> yet. Run{" "}
            <code>bonsai-drop-select.js</code> then <code>bonsai-drop-publish.js</code>.
          </CardContent>
        </Card>
      )}

      <DropKpis
        manifest={manifest}
        listings={listings}
        sales={activity}
        captainIcp={captainIcp}
        stats={stats}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top holders (drop set)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {holderCounts.length === 0 ? (
              <p className="text-muted-foreground">No holder data yet.</p>
            ) : (
              holderCounts.map(([p, n]) => (
                <div key={p} className="flex justify-between font-mono text-xs">
                  <span>{shortPrincipal(p)}</span>
                  <span>{n}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rarity · sold / total</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {Object.entries(raritySold).map(([r, c]) => (
              <div key={r} className="flex justify-between">
                <span>{r}</span>
                <span>
                  {c.sold} / {c.total}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.slice(0, 40).map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell>
                    <Badge variant="secondary">{row.kind}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.tokenId != null ? (
                      <a
                        className="underline"
                        href={bazaarTokenUrl(row.tokenId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        #{String(row.tokenId)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.priceE8s != null ? `${e8sToIcp(row.priceE8s).toFixed(2)} ICP` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {shortPrincipal(row.who.toText())}
                  </TableCell>
                  <TableCell className="text-xs">{formatTsNs(row.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {manifest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drop tokens</CardTitle>
            <CardDescription>
              {tokenRows.filter((r) => r.listed).length} active listings ·{" "}
              {tokenRows.filter((r) => r.sold).length} no longer with Captain
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokenRows.map((row) => (
                  <TableRow key={row.tokenId}>
                    <TableCell>
                      <a
                        href={bazaarTokenUrl(row.tokenId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {row.tokenId}
                      </a>
                    </TableCell>
                    <TableCell>{row.rarity}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {shortPrincipal(row.owner)}
                    </TableCell>
                    <TableCell>
                      {row.listed ? (
                        <Badge>List #{row.listingId}</Badge>
                      ) : row.sold ? (
                        <Badge variant="secondary">Sold / moved</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CaptainHederaWalletCard() {
  const { accountId: myHashPack, sendHbar } = useHederaWallet();
  const [info, setInfo] = useState<CaptainHederaInfo | null>(null);
  const [summary, setSummary] = useState<HederaAccountSummary | null>(null);
  const [txs, setTxs] = useState<HederaTxRow[]>([]);
  const [fundAmount, setFundAmount] = useState("25");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const i = await fetchCaptainHederaInfo();
    setInfo(i);
    if (i?.accountId) {
      const [s, t] = await Promise.all([
        fetchHederaAccountSummary(i.accountId),
        fetchHederaTransactions(i.accountId, 25),
      ]);
      setSummary(s);
      setTxs(t);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const fund = useCallback(async () => {
    if (!info?.accountId) return;
    const amount = Number(fundAmount);
    setSending(true);
    try {
      const txId = await sendHbar(info.accountId, amount);
      toast.success(`Sent ${amount} HBAR to Captain (${txId})`);
      setTimeout(() => void load(), 5_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "HBAR transfer failed");
    } finally {
      setSending(false);
    }
  }, [info, fundAmount, sendHbar, load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Captain Capsaicin · Hedera wallet</CardTitle>
        <CardDescription>
          {info?.accountId ? (
            <a
              className="underline font-mono"
              href={hashscanAccountUrl(info.accountId)}
              target="_blank"
              rel="noreferrer"
            >
              {info.accountId}
            </a>
          ) : (
            <>
              Not provisioned — run <code>hedera-captain-setup.js --resolve</code> on the
              worker to publish <code>/hedera/captain.json</code>.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">HBAR balance</p>
            <p className="text-2xl font-semibold">
              {summary ? summary.balanceHbar.toFixed(2) : "—"}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor="fund-hbar" className="text-xs">
                Fund from my HashPack (HBAR)
              </Label>
              <Input
                id="fund-hbar"
                className="w-28"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <Button
              size="sm"
              disabled={!myHashPack || !info?.accountId || sending}
              onClick={() => void fund()}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
            </Button>
          </div>
          {!myHashPack && (
            <p className="text-xs text-muted-foreground">
              Connect HashPack in the site header to enable funding.
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Recent transactions</p>
          <div className="max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Net HBAR</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map((t) => (
                  <TableRow key={t.transactionId}>
                    <TableCell className="text-xs">{t.name}</TableCell>
                    <TableCell className="text-xs">{t.result}</TableCell>
                    <TableCell
                      className={
                        t.netHbar > 0
                          ? "text-green-600 text-xs"
                          : t.netHbar < 0
                            ? "text-red-500 text-xs"
                            : "text-xs"
                      }
                    >
                      {t.netHbar ? t.netHbar.toFixed(4) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{t.consensusAt}</TableCell>
                  </TableRow>
                ))}
                {txs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-xs text-muted-foreground">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SentxMarketCard() {
  const [listings, setListings] = useState<SentxListingRow[]>([]);
  const [sales, setSales] = useState<SentxSaleRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!HEDERA_TOKEN_ID || !sentxConfigured()) return;
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        fetchSentxListings(HEDERA_TOKEN_ID),
        fetchSentxSales(HEDERA_TOKEN_ID),
      ]);
      setListings(l);
      setSales(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const gross = sales.reduce((a, s) => a + (s.priceHbar ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">SentX market</CardTitle>
            <CardDescription>
              {HEDERA_TOKEN_ID ? (
                <a
                  className="underline"
                  href={`${SENTX_URL}/nft-marketplace/${HEDERA_TOKEN_ID}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Collection on SentX <ExternalLink className="inline w-3 h-3" />
                </a>
              ) : (
                "Set VITE_HEDERA_DROP_TOKEN_ID after HTS mint."
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!sentxConfigured() ? (
          <p className="text-sm text-muted-foreground">
            Set <code>VITE_SENTX_API_KEY</code> (free key from SentX Discord/docs) to poll
            live listings and sales. Holder data below comes from the public mirror node
            and works without a key.
          </p>
        ) : (
          <>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Active listings</p>
                <p className="text-xl font-semibold">{listings.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="text-xl font-semibold">{sales.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross HBAR</p>
                <p className="text-xl font-semibold">{gross.toFixed(1)}</p>
              </div>
            </div>
            <div className="max-h-56 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Price (HBAR)</TableHead>
                    <TableHead>Seller</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.slice(0, 30).map((l, i) => (
                    <TableRow key={`${l.serial}-${i}`}>
                      <TableCell className="text-xs">#{l.serial ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {l.priceHbar != null ? l.priceHbar.toFixed(1) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.seller ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HederaDropPanel() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchHederaTokenNfts>>
  >([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!HEDERA_TOKEN_ID) return;
    setLoading(true);
    try {
      setRows(await fetchHederaTokenNfts(HEDERA_TOKEN_ID, 500));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const holders = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (!r.accountId) continue;
      m.set(r.accountId, (m.get(r.accountId) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="space-y-4">
      <HederaTwinClaimCard />
      <CaptainHederaWalletCard />
      <SentxMarketCard />
      {HEDERA_TOKEN_ID ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">HTS holders</CardTitle>
                <CardDescription>
                  <a
                    className="underline font-mono"
                    href={hashscanTokenUrl(HEDERA_TOKEN_ID)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {HEDERA_TOKEN_ID}
                  </a>{" "}
                  · {rows.length} NFTs · mirror node (no key needed)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm max-h-96 overflow-auto">
            {holders.map(([id, n]) => (
              <div key={id} className="flex justify-between font-mono text-xs">
                <a
                  className="underline"
                  href={hashscanAccountUrl(id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {id}
                </a>
                <span>{n}</span>
              </div>
            ))}
            {holders.length === 0 && (
              <p className="text-muted-foreground">No holders yet.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Set <code>VITE_HEDERA_DROP_TOKEN_ID</code> after HTS mint to enable holder
            monitoring for the collection.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AdminBonsaiDropTab() {
  return (
    <Tabs defaultValue="bonsai">
      <TabsList>
        <TabsTrigger value="bonsai">Bonsai (ICP)</TabsTrigger>
        <TabsTrigger value="hedera">Hedera</TabsTrigger>
      </TabsList>
      <TabsContent value="bonsai" className="mt-4">
        <BonsaiDropPanel />
      </TabsContent>
      <TabsContent value="hedera" className="mt-4">
        <HederaDropPanel />
      </TabsContent>
    </Tabs>
  );
}
