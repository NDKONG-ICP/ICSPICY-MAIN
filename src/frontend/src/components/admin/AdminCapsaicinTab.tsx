import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useNftTokenIdsForPrincipal } from "@/hooks/useMyNftIds";
import {
  formatTokenAmount,
  useTokenBalancesForPrincipal,
} from "@/hooks/useTokenBalances";
import { getAuthenticatedAgentHubActor } from "@/lib/agent-hub-idl";
import {
  addCanisterController,
  AGENT_HUB,
  BACKEND,
  CAPTAIN_AGENT_IDS,
  CAPTAIN_PRINCIPAL,
  type CapsaicinNftCard,
  type FeedPost,
  fetchBonsaiNftsForPrincipal,
  fetchCanisterControllers,
  fetchCrumbBalance,
  fetchCrumbeatrFeed,
  fetchSwopFeed,
} from "@/lib/capsaicin-portfolio";
import { Principal } from "@dfinity/principal";
import {
  Copy,
  ExternalLink,
  Leaf,
  Loader2,
  RefreshCw,
  Send,
  Shield,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const CANOPY_URL = "https://7h6n6-eqaaa-aaaau-ag6da-cai.icp0.io/";
const BAZAAR_URL = "https://iabi6-zqaaa-aaaau-agwpq-cai.icp0.io/";
const CRUMB_URL = "https://crumbeatr.xyz";
const SWOP_URL = "https://theswop.app/@CaptainCapsaicin";

function copy(text: string, label: string) {
  void navigator.clipboard.writeText(text);
  toast.success(`Copied ${label}`);
}

function NftCard({ nft }: { nft: CapsaicinNftCard }) {
  const rarityHint =
    nft.traits.find((t) => /rarity|tier|grade/i.test(t.trait))?.value ||
    nft.traits
      .slice(0, 3)
      .map((t) => t.value)
      .join(" · ") ||
    "—";
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden flex flex-col">
      {nft.image ? (
        <img
          src={nft.image.startsWith("data:") || nft.image.startsWith("http")
            ? nft.image
            : nft.image}
          alt={nft.name}
          className="aspect-square w-full object-cover bg-muted"
        />
      ) : (
        <div className="aspect-square bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="p-3 space-y-1.5 text-sm">
        <div className="font-medium leading-tight">{nft.name}</div>
        <div className="text-xs text-muted-foreground font-mono">
          #{nft.tokenId}
          {nft.collectionId ? ` · coll ${nft.collectionId}` : ""}
        </div>
        <Badge variant="outline" className="text-[10px]">
          {nft.source === "bonsai" ? "Bonsai / Orbit" : "IC SPICY"}
        </Badge>
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {rarityHint}
        </p>
        {nft.traits.length > 0 && (
          <details className="text-[11px]">
            <summary className="cursor-pointer text-muted-foreground">
              Traits ({nft.traits.length})
            </summary>
            <ul className="mt-1 space-y-0.5 max-h-28 overflow-y-auto">
              {nft.traits.map((t) => (
                <li key={`${t.trait}-${t.value}`}>
                  <span className="text-muted-foreground">{t.trait}:</span>{" "}
                  {t.value}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function FeedList({
  title,
  posts,
  empty,
}: {
  title: string;
  posts: FeedPost[];
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      {posts.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {posts.map((p) => (
            <li
              key={`${p.platform}-${p.id}`}
              className="rounded border border-border/50 p-2 text-xs"
            >
              <div className="flex justify-between gap-2 text-muted-foreground mb-1">
                <span className="font-mono truncate">
                  {p.platform} · {p.id} · {p.author.slice(0, 12)}…
                </span>
                {p.createdAt && <span>{p.createdAt}</span>}
              </div>
              <p className="whitespace-pre-wrap">{p.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminCapsaicinTab() {
  const { principal, identity, isAuthenticated } = useAuth();
  const captain = useMemo(
    () => Principal.fromText(CAPTAIN_PRINCIPAL),
    [],
  );
  const balances = useTokenBalancesForPrincipal(captain);
  const spicyNfts = useNftTokenIdsForPrincipal(captain);

  const [canopyPrincipal, setCanopyPrincipal] = useState(CAPTAIN_PRINCIPAL);
  const [sweepPrincipal, setSweepPrincipal] = useState("");
  const [bonsaiNfts, setBonsaiNfts] = useState<CapsaicinNftCard[]>([]);
  const [crumbBal, setCrumbBal] = useState<bigint | null>(null);
  const [crumbFeed, setCrumbFeed] = useState<FeedPost[]>([]);
  const [swopMine, setSwopMine] = useState<FeedPost[]>([]);
  const [swopRecent, setSwopRecent] = useState<FeedPost[]>([]);
  const [hubControllers, setHubControllers] = useState<string[]>([]);
  const [backendControllers, setBackendControllers] = useState<string[]>([]);
  const [newController, setNewController] = useState("");
  const [controllerTarget, setControllerTarget] = useState<"hub" | "backend">(
    "hub",
  );
  const [transferTo, setTransferTo] = useState("");
  const [transferTokenId, setTransferTokenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(true);

  const meText = principal?.toText() ?? "";
  const iAmHubController = hubControllers.includes(meText);
  const iAmBackendController = backendControllers.includes(meText);

  const refreshExtra = useCallback(async () => {
    setLoadingExtra(true);
    try {
      const hub = await getAuthenticatedAgentHubActor();
      if (hub) {
        await hub.ensureAdminRegistration();
        const secrets = await hub.getSecrets([
          "canopy_wallet_principal",
          "ambassador_sweep_principal",
        ]);
        const map = Object.fromEntries(secrets);
        if (map.canopy_wallet_principal) {
          setCanopyPrincipal(map.canopy_wallet_principal.trim());
        }
        if (map.ambassador_sweep_principal) {
          setSweepPrincipal(map.ambassador_sweep_principal.trim());
          setTransferTo((prev) => prev || map.ambassador_sweep_principal.trim());
        }
      }

      const [nfts, crumb, feed, swop] = await Promise.all([
        fetchBonsaiNftsForPrincipal(CAPTAIN_PRINCIPAL),
        fetchCrumbBalance(CAPTAIN_PRINCIPAL).catch(() => null),
        fetchCrumbeatrFeed(15).catch(() => []),
        fetchSwopFeed(CAPTAIN_PRINCIPAL, 15).catch(() => ({
          mine: [],
          recent: [],
        })),
      ]);
      setBonsaiNfts(nfts);
      setCrumbBal(crumb);
      setCrumbFeed(feed);
      setSwopMine(swop.mine);
      setSwopRecent(swop.recent);

      if (identity && isAuthenticated) {
        try {
          const [h, b] = await Promise.all([
            fetchCanisterControllers(AGENT_HUB, identity),
            fetchCanisterControllers(BACKEND, identity),
          ]);
          setHubControllers(h.controllers);
          setBackendControllers(b.controllers);
        } catch (err) {
          console.warn("[capsaicin] controller status:", err);
          toast.message(
            "Could not read canister controllers (need to be a controller to call canister_status).",
          );
        }
      }
    } finally {
      setLoadingExtra(false);
    }
  }, [identity, isAuthenticated]);

  useEffect(() => {
    void refreshExtra();
  }, [refreshExtra]);

  async function enqueue(agentId: bigint, payload: object, label: string) {
    setBusy(true);
    try {
      const hub = await getAuthenticatedAgentHubActor();
      if (!hub) throw new Error("Not authenticated to agent hub");
      const id = await hub.enqueueJob(agentId, JSON.stringify(payload));
      toast.success(`${label} — job #${id.toString()} queued (worker will run)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onAddController() {
    if (!identity || !newController.trim()) return;
    setBusy(true);
    try {
      const canisterId = controllerTarget === "hub" ? AGENT_HUB : BACKEND;
      const next = await addCanisterController(
        canisterId,
        newController.trim(),
        identity,
      );
      if (controllerTarget === "hub") setHubControllers(next);
      else setBackendControllers(next);
      toast.success(`Added controller to ${controllerTarget}`);
      setNewController("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Add controller failed — your II must already be a controller",
      );
    } finally {
      setBusy(false);
    }
  }

  const icpRow = balances.data?.find((r) => r.symbol === "ICP");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Leaf className="h-5 w-5 text-orange-500" />
            Captain Capsaicin
          </h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Multi-wallet portfolio, Orbit mint (not secondary buy), sweep/transfer
            via worker jobs, Crumbeatr + SWOP feeds, and canister controllers.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void balances.refetch();
            void spicyNfts.refetch();
            void refreshExtra();
          }}
          disabled={loadingExtra || busy}
        >
          {loadingExtra ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Wallets */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Wallets
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              label: "Operating / Canopy (BonsaiOS)",
              value: canopyPrincipal,
              note: "Plain principal for CRM, Orbit mint, Bazaar",
            },
            {
              label: "Sweep destination",
              value: sweepPrincipal || "(set ambassador_sweep_principal)",
              note: "Admin treasury for excess ICP / CRUMB",
            },
          ].map((w) => (
            <div
              key={w.label}
              className="rounded-lg border border-border/60 p-3 space-y-1"
            >
              <div className="text-xs text-muted-foreground">{w.label}</div>
              <div className="font-mono text-xs break-all flex items-start gap-2">
                <span className="flex-1">{w.value}</span>
                {w.value.startsWith("2") || w.value.startsWith("g") ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copy(w.value, w.label)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">{w.note}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <a
            className="inline-flex items-center gap-1 text-primary underline"
            href={CANOPY_URL}
            target="_blank"
            rel="noreferrer"
          >
            Canopy <ExternalLink className="h-3 w-3" />
          </a>
          <a
            className="inline-flex items-center gap-1 text-primary underline"
            href={BAZAAR_URL}
            target="_blank"
            rel="noreferrer"
          >
            Bazaar <ExternalLink className="h-3 w-3" />
          </a>
          <a
            className="inline-flex items-center gap-1 text-primary underline"
            href={SWOP_URL}
            target="_blank"
            rel="noreferrer"
          >
            SWOP profile <ExternalLink className="h-3 w-3" />
          </a>
          <a
            className="inline-flex items-center gap-1 text-primary underline"
            href={CRUMB_URL}
            target="_blank"
            rel="noreferrer"
          >
            Crumbeatr <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      {/* Balances */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">Token balances</h4>
        {balances.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
            {balances.data?.map((r) => (
              <div
                key={r.symbol}
                className="rounded border border-border/50 px-3 py-2 text-sm"
              >
                <div className="text-xs text-muted-foreground">{r.symbol}</div>
                <div className="font-mono">{r.formattedBalance}</div>
              </div>
            ))}
            <div className="rounded border border-border/50 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">CRUMB</div>
              <div className="font-mono">
                {crumbBal == null
                  ? "—"
                  : formatTokenAmount(crumbBal, 8)}
              </div>
            </div>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          ICP shown: {icpRow?.formattedBalance ?? "—"}. Mint Orbit @ 0.05 ICP
          (prefer mint over floor buy).
        </p>
      </section>

      {/* Actions */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Send className="h-4 w-4" /> Agent actions (worker-signed)
        </h4>
        <p className="text-xs text-muted-foreground">
          Keys never leave the worker. These enqueue hub jobs for Capsaicin agents
          17–19.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void enqueue(
                CAPTAIN_AGENT_IDS.bonsai,
                { action: "mint_orbit", maxQty: 1 },
                "Mint Orbit Spot",
              )
            }
          >
            Mint Orbit Spot (not buy)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void enqueue(
                CAPTAIN_AGENT_IDS.bonsai,
                { action: "sweep" },
                "Sweep ICP/CRUMB",
              )
            }
          >
            Sweep to admin
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void enqueue(
                CAPTAIN_AGENT_IDS.crumbeatr,
                { action: "engage" },
                "Crumbeatr engage",
              )
            }
          >
            Run Crumbeatr feed job
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void enqueue(
                CAPTAIN_AGENT_IDS.swop,
                { action: "engage" },
                "SWOP engage",
              )
            }
          >
            Run SWOP feed job
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-3 items-end">
          <div>
            <Label className="text-xs">Transfer Orbit NFT →</Label>
            <Input
              className="font-mono text-xs"
              placeholder="recipient principal"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Token ID</Label>
            <Input
              className="font-mono text-xs"
              placeholder="5502"
              value={transferTokenId}
              onChange={(e) => setTransferTokenId(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy || !transferTo.trim() || !transferTokenId.trim()}
            onClick={() =>
              void enqueue(
                CAPTAIN_AGENT_IDS.bonsai,
                {
                  action: "transfer_nft",
                  tokenId: transferTokenId.trim(),
                  to: transferTo.trim(),
                },
                "Transfer Orbit NFT",
              )
            }
          >
            Transfer NFT
          </Button>
        </div>
      </section>

      {/* NFTs */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">
          NFTs — Bonsai Orbit ({bonsaiNfts.length}) · IC SPICY (
          {spicyNfts.data?.length ?? 0})
        </h4>
        {loadingExtra ? (
          <Skeleton className="h-40 w-full" />
        ) : bonsaiNfts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No Bonsai NFTs yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bonsaiNfts.map((n) => (
              <NftCard key={n.tokenId} nft={n} />
            ))}
          </div>
        )}
        {(spicyNfts.data?.length ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground font-mono">
            IC SPICY token IDs: {spicyNfts.data?.map(String).join(", ")}
          </p>
        )}
      </section>

      {/* Feeds */}
      <section className="grid gap-6 md:grid-cols-2">
        <FeedList
          title="Crumbeatr — recent feed"
          posts={crumbFeed}
          empty="Could not load Crumbeatr feed (query may require different encoding)."
        />
        <div className="space-y-4">
          <FeedList
            title="SWOP — Capsaicin posts"
            posts={swopMine}
            empty="No Capsaicin SWOP posts found."
          />
          <FeedList
            title="SWOP — public recent"
            posts={swopRecent}
            empty="No recent SWOP posts."
          />
        </div>
      </section>

      {/* Controllers */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" /> Canister controllers
        </h4>
        <p className="text-xs text-muted-foreground">
          Capsaicin is a wallet principal, not a canister. Controllers apply to{" "}
          <code>agent_hub</code> / <code>backend</code>. Adding a controller
          requires your Internet Identity to already be a controller.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded border p-3 text-xs space-y-1">
            <div className="font-medium">
              agent_hub{" "}
              {iAmHubController ? (
                <Badge className="ml-1">you are controller</Badge>
              ) : (
                <Badge variant="outline" className="ml-1">
                  you are not controller
                </Badge>
              )}
            </div>
            <ul className="font-mono break-all space-y-0.5">
              {hubControllers.map((c) => (
                <li key={c}>{c}</li>
              ))}
              {hubControllers.length === 0 && (
                <li className="text-muted-foreground">—</li>
              )}
            </ul>
          </div>
          <div className="rounded border p-3 text-xs space-y-1">
            <div className="font-medium">
              backend{" "}
              {iAmBackendController ? (
                <Badge className="ml-1">you are controller</Badge>
              ) : (
                <Badge variant="outline" className="ml-1">
                  you are not controller
                </Badge>
              )}
            </div>
            <ul className="font-mono break-all space-y-0.5">
              {backendControllers.map((c) => (
                <li key={c}>{c}</li>
              ))}
              {backendControllers.length === 0 && (
                <li className="text-muted-foreground">—</li>
              )}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Target</Label>
            <select
              className="flex h-9 rounded-md border bg-background px-2 text-sm"
              value={controllerTarget}
              onChange={(e) =>
                setControllerTarget(e.target.value as "hub" | "backend")
              }
            >
              <option value="hub">agent_hub</option>
              <option value="backend">backend</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Add controller principal</Label>
            <Input
              className="font-mono text-xs"
              value={newController}
              onChange={(e) => setNewController(e.target.value)}
              placeholder={meText || "principal"}
            />
          </div>
          <Button
            size="sm"
            disabled={busy || !newController.trim()}
            onClick={() => void onAddController()}
          >
            Add controller
          </Button>
          {meText && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setNewController(meText)}
            >
              Use my II
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
