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
import { fetchCaptainProofIndex } from "@/lib/captain-proof";
import {
  addCanisterController,
  AGENT_HUB,
  BACKEND,
  BGA_ARENA_URL,
  CAPTAIN_AGENT_IDS,
  CAPTAIN_PRINCIPAL,
  type BladeGroveOnChain,
  type CapsaicinNftCard,
  type FeedPost,
  fetchBonsaiNftsForPrincipal,
  fetchBladeGroveOnChain,
  fetchCanisterControllers,
  fetchCrumbBalance,
  fetchCrumbeatrFeed,
  fetchSwopFeed,
} from "@/lib/capsaicin-portfolio";
import { Principal } from "@dfinity/principal";
import {
  Copy,
  ExternalLink,
  ImageIcon,
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
const MINIROUTER_ACTIVITY_URL = "https://minirouter.sh";

type CaptainPow = {
  atNs: bigint;
  detail: string;
  minirouter: string | null;
  model: string | null;
  est: string | null;
  icp: string | null;
  blob: string | null;
  jpeg: string | null;
};

/** Parse `captain_pow:minirouter=…;icp=…` from hub audit detail. */
function parseCaptainPow(detail: string, atNs: bigint): CaptainPow | null {
  const m = String(detail).match(/captain_pow:([^\s]+)/);
  if (!m) return null;
  const fields: Record<string, string> = {};
  for (const part of m[1].split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    fields[part.slice(0, eq)] = part.slice(eq + 1);
  }
  if (fields.mock === "1") return null;
  if (!fields.minirouter && !fields.icp) return null;
  return {
    atNs,
    detail: String(detail),
    minirouter: fields.minirouter ?? null,
    model: fields.model ?? null,
    est: fields.est ?? null,
    icp: fields.icp ?? null,
    blob: fields.blob ?? null,
    jpeg: fields.jpeg ?? null,
  };
}

function copy(text: string, label: string) {
  void navigator.clipboard.writeText(text);
  toast.success(`Copied ${label}`);
}

function nftImageSrc(image: string): string {
  return image;
}

function rarityLabel(nft: CapsaicinNftCard): string {
  return (
    nft.traits.find((t) => /rarity|tier|grade/i.test(t.trait))?.value ||
    nft.traits
      .slice(0, 3)
      .map((t) => t.value)
      .join(" · ") ||
    "—"
  );
}

function OrbitGallery({
  nfts,
  selectedId,
  onSelect,
}: {
  nfts: CapsaicinNftCard[];
  selectedId: string;
  onSelect: (tokenId: string) => void;
}) {
  const selected =
    nfts.find((n) => n.tokenId === selectedId) ?? nfts[0] ?? null;

  return (
    <div className="overflow-hidden rounded-xl border border-orange-500/25 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-orange-100/95">
            Orbit Spots gallery
          </p>
          <p className="text-[11px] text-zinc-400">
            {nfts.length} held · scroll the strip · click a tile for traits
          </p>
        </div>
        {selected && (
          <Badge
            variant="outline"
            className="border-orange-400/40 text-orange-200/90"
          >
            #{selected.tokenId}
          </Badge>
        )}
      </div>

      {selected && (
        <div className="grid gap-0 border-b border-white/10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="relative min-h-[280px] bg-black/40 lg:min-h-[360px]">
            {selected.image ? (
              <img
                src={nftImageSrc(selected.image)}
                alt={selected.name}
                className="absolute inset-0 h-full w-full object-contain p-3"
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-zinc-500">
                No image
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-16">
              <p className="text-lg font-medium text-white drop-shadow">
                {selected.name}
              </p>
              <p className="font-mono text-xs text-zinc-300">
                token {selected.tokenId}
                {selected.collectionId
                  ? ` · collection ${selected.collectionId}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto overscroll-contain p-4">
            <div className="space-y-1">
              <Badge className="bg-orange-600/90 hover:bg-orange-600">
                Bonsai / Orbit
              </Badge>
              <p className="text-sm text-zinc-200">{rarityLabel(selected)}</p>
              {selected.description ? (
                <p className="text-xs leading-relaxed text-zinc-400">
                  {selected.description}
                </p>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                Traits ({selected.traits.length})
              </p>
              {selected.traits.length === 0 ? (
                <p className="text-xs text-zinc-500">No traits on metadata.</p>
              ) : (
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {selected.traits.map((t) => (
                    <li
                      key={`${t.trait}-${t.value}`}
                      className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {t.trait}
                      </div>
                      <div className="text-xs text-zinc-100">{t.value}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain scroll-smooth px-3 py-3 [scrollbar-gutter:stable]"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(249,115,22,0.45) transparent",
        }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {nfts.map((nft) => {
            const active = selected?.tokenId === nft.tokenId;
            return (
              <button
                key={nft.tokenId}
                type="button"
                onClick={() => onSelect(nft.tokenId)}
                className={`group relative overflow-hidden rounded-lg text-left transition ring-offset-2 ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  active
                    ? "ring-2 ring-orange-400 shadow-[0_0_0_1px_rgba(249,115,22,0.35)]"
                    : "ring-1 ring-white/10 hover:ring-orange-400/50"
                }`}
              >
                <div className="aspect-square bg-zinc-800">
                  {nft.image ? (
                    <img
                      src={nftImageSrc(nft.image)}
                      alt={nft.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] text-zinc-500">
                      No image
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8">
                  <p className="truncate text-[11px] font-medium text-white">
                    {nft.name}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-300">
                    #{nft.tokenId}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
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
  const [bladeGrove, setBladeGrove] = useState<BladeGroveOnChain | null>(null);
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

  const [pendingJobs, setPendingJobs] = useState<
    Array<{ id: string; label: string; at: number }>
  >([]);
  const [lastWorkerNote, setLastWorkerNote] = useState<string>("");
  const [imageProofs, setImageProofs] = useState<CaptainPow[]>([]);

  const refreshExtra = useCallback(async () => {
    setLoadingExtra(true);
    try {
      const hub = await getAuthenticatedAgentHubActor(identity);
      let pows: CaptainPow[] = [];
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
        try {
          const audit = await hub.getAuditLogEntries(120n);
          const bonsaiRuns = audit
            .filter(
              (e) =>
                e.action === "reportRun" &&
                String(e.detail).includes("ambassador_bonsai"),
            )
            .sort((a, b) => Number(b.at - a.at));
          const preferred =
            bonsaiRuns.find((e) =>
              String(e.detail).includes("Blade Grove play"),
            ) || bonsaiRuns[0];
          if (preferred) {
            setLastWorkerNote(String(preferred.detail));
          }
          pows = audit
            .map((e) => parseCaptainPow(String(e.detail), e.at))
            .filter((p): p is CaptainPow => p != null)
            .sort((a, b) => Number(b.atNs - a.atNs))
            .slice(0, 12);
          const completedIds = new Set(
            audit
              .filter((e) => e.action === "reportJobComplete")
              .map((e) => String(e.detail)),
          );
          setPendingJobs((prev) =>
            prev.filter((p) => !completedIds.has(p.id)),
          );
        } catch {
          /* audit optional */
        }
      }

      // Public ICP proofs survive even when hub audit rotates or hub auth fails.
      try {
        const index = await fetchCaptainProofIndex();
        const seen = new Set(
          pows.map((p) => p.blob || p.icp).filter(Boolean) as string[],
        );
        for (const p of index.proofs) {
          const key = p.id || p.imageUrl;
          if (!key || seen.has(key) || seen.has(p.imageUrl)) continue;
          seen.add(key);
          seen.add(p.imageUrl);
          const atMs = Date.parse(p.at);
          pows.push({
            atNs: BigInt(
              Number.isFinite(atMs) ? Math.trunc(atMs * 1_000_000) : 0,
            ),
            detail: `captain_pow:public;icp=${p.imageUrl};blob=${p.id}`,
            minirouter: p.requestId,
            model: null,
            est: null,
            icp: p.imageUrl,
            blob: p.id,
            jpeg: null,
          });
        }
        pows.sort((a, b) => Number(b.atNs - a.atNs));
        setImageProofs(pows.slice(0, 12));
      } catch {
        setImageProofs(pows);
      }

      const [nfts, crumb, feed, swop, bga] = await Promise.all([
        fetchBonsaiNftsForPrincipal(CAPTAIN_PRINCIPAL),
        fetchCrumbBalance(CAPTAIN_PRINCIPAL).catch(() => null),
        fetchCrumbeatrFeed(15).catch(() => []),
        fetchSwopFeed(CAPTAIN_PRINCIPAL, 15).catch(() => ({
          mine: [],
          recent: [],
        })),
        fetchBladeGroveOnChain(CAPTAIN_PRINCIPAL).catch(() => null),
      ]);
      setBonsaiNfts(nfts);
      if (nfts.length > 0) {
        setTransferTokenId((prev) =>
          prev && nfts.some((n) => n.tokenId === prev) ? prev : nfts[0].tokenId,
        );
      }
      setCrumbBal(crumb);
      setCrumbFeed(feed);
      setSwopMine(swop.mine);
      setSwopRecent(swop.recent);
      setBladeGrove(bga);

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
          // Expected when the logged-in II is not a canister controller —
          // do not toast; pack/play refreshes hit this path often.
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
      const hub = await getAuthenticatedAgentHubActor(identity);
      if (!hub) throw new Error("Not authenticated to agent hub");
      const id = await hub.enqueueJob(agentId, JSON.stringify(payload));
      const idStr = id.toString();
      setPendingJobs((prev) => [
        { id: idStr, label, at: Date.now() },
        ...prev.filter((p) => p.id !== idStr),
      ]);
      toast.success(
        `${label} — job #${idStr} queued. Worker polls ~every 60s; UI will refresh.`,
      );
      // Poll portfolio after typical worker latency (mint takes ~15–90s once claimed)
      const delays = [20_000, 45_000, 75_000, 120_000];
      for (const ms of delays) {
        window.setTimeout(() => {
          void balances.refetch();
          void spicyNfts.refetch();
          void refreshExtra();
        }, ms);
      }
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

      {(lastWorkerNote || pendingJobs.length > 0) && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 text-sm space-y-1">
          {pendingJobs.length > 0 && (
            <p>
              Pending worker jobs:{" "}
              {pendingJobs.map((p) => `#${p.id} (${p.label})`).join(", ")}.
              Poll ~60s; this panel auto-refreshes after mint.
            </p>
          )}
          {lastWorkerNote && (
            <p className="text-xs font-mono break-words text-muted-foreground">
              Last bonsai run: {lastWorkerNote}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            On-chain now: {bonsaiNfts.length} Orbit NFT(s)
            {icpRow ? ` · ${icpRow.formattedBalance} ICP` : ""}.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Proof of work
          <Badge variant="secondary" className="text-[10px]">
            MiniRouter + ICP
          </Badge>
        </h4>
        <p className="text-xs text-muted-foreground">
          Captain auto-publishes daily (ET) to Community + Crumbeatr + SWOP with a unique MiniRouter image. Proof of work: MiniRouter request id +
          image hosted on the IC SPICY frontend asset canister. Merges recent
          hub audit with public{" "}
          <a
            className="underline text-primary"
            href="/p/captain"
            target="_blank"
            rel="noreferrer"
          >
            /p/captain
          </a>{" "}
          proofs.
        </p>
        {imageProofs.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/60 p-3">
            No image proofs in recent hub audit yet. Appear after the next
            Capsaicin post with a live MiniRouter image.
          </p>
        ) : (
          <div className="space-y-2">
            {imageProofs.map((p) => {
              const when = new Date(Number(p.atNs / 1_000_000n));
              return (
                <div
                  key={`${String(p.atNs)}-${p.minirouter ?? p.icp ?? ""}`}
                  className="rounded-lg border border-border/60 p-3 flex gap-3"
                >
                  {p.icp ? (
                    <a
                      href={p.icp}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 block h-16 w-16 overflow-hidden rounded-md border border-border/50 bg-muted"
                    >
                      <img
                        src={p.icp}
                        alt="Captain Capsaicin"
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="shrink-0 h-16 w-16 rounded-md border border-dashed border-border/50 flex items-center justify-center text-[10px] text-muted-foreground">
                      no ICP
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-[11px] text-muted-foreground">
                      {when.toLocaleString()}
                      {p.est ? ` · ${p.est}` : ""}
                      {p.jpeg ? ` · ${p.jpeg}` : ""}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="text-muted-foreground">MiniRouter</span>
                      {p.minirouter ? (
                        <>
                          <code className="font-mono text-[11px] break-all">
                            {p.minirouter}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() =>
                              copy(p.minirouter!, "MiniRouter request id")
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <a
                            className="inline-flex items-center gap-0.5 text-primary underline"
                            href={MINIROUTER_ACTIVITY_URL}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Activity <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    {p.model && (
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {p.model}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="text-muted-foreground">ICP</span>
                      {p.icp ? (
                        <a
                          className="inline-flex items-center gap-0.5 text-primary underline break-all"
                          href={p.icp}
                          target="_blank"
                          rel="noreferrer"
                        >
                          captain-posts
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          upload missing
                        </span>
                      )}
                      {p.blob && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          blob/{p.blob}
                        </span>
                      )}
                      {(p.blob ||
                        (p.icp && /\/captain-posts\/([^.]+)/.exec(p.icp)?.[1])) && (
                        <a
                          className="inline-flex items-center gap-0.5 text-primary underline"
                          href={`/p/captain/${p.blob || /\/captain-posts\/([^.]+)/.exec(p.icp!)?.[1]}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Share page <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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

      {/* Blade Grove Arena */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Leaf className="h-4 w-4" /> Blade Grove Arena
        </h4>
        <p className="text-xs text-muted-foreground">
          Send sealed pack NFTs to Capsaicin principal{" "}
          <button
            type="button"
            className="font-mono text-primary underline"
            onClick={() => copy(CAPTAIN_PRINCIPAL, "Capsaicin principal")}
          >
            {CAPTAIN_PRINCIPAL.slice(0, 12)}…
          </button>{" "}
          (foil ledger). Story grind runs on the worker; wins auto-post.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
          {[
            ["Sealed packs", bladeGrove?.sealedPacks],
            ["Warden credits", bladeGrove?.wardenCredits],
            ["Captain credits", bladeGrove?.captainCredits],
            ["Playable cards", bladeGrove?.playableCards],
            ["Owned cards", bladeGrove?.ownedCards],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="rounded border border-border/50 px-3 py-2 text-sm"
            >
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-mono">
                {loadingExtra && bladeGrove == null ? "…" : (val ?? "—")}
              </div>
            </div>
          ))}
        </div>
        <a
          className="inline-flex items-center gap-1 text-xs text-primary underline"
          href={BGA_ARENA_URL}
          target="_blank"
          rel="noreferrer"
        >
          Open Arena <ExternalLink className="h-3 w-3" />
        </a>
      </section>

      {/* Actions */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Send className="h-4 w-4" /> Agent actions (worker-signed)
        </h4>
        <p className="text-xs text-muted-foreground">
          Keys never leave the worker. These enqueue hub jobs for Capsaicin agents
          17–19. Blade Grove posts auto-publish to Crumbeatr + SWOP after
          compliance.
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
                { action: "play_blade_grove", maxNodes: 3 },
                "Play Blade Grove",
              )
            }
          >
            Play Blade Grove (×3 nodes)
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void enqueue(
                CAPTAIN_AGENT_IDS.bonsai,
                { action: "open_packs" },
                "Open BGA packs",
              )
            }
          >
            Open BGA packs
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void enqueue(
                CAPTAIN_AGENT_IDS.bonsai,
                { action: "blade_grove_status" },
                "Blade Grove status",
              )
            }
          >
            Blade Grove status
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
          <Skeleton className="h-[420px] w-full rounded-xl" />
        ) : bonsaiNfts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No Bonsai NFTs yet.</p>
        ) : (
          <OrbitGallery
            nfts={bonsaiNfts}
            selectedId={
              transferTokenId &&
              bonsaiNfts.some((n) => n.tokenId === transferTokenId)
                ? transferTokenId
                : bonsaiNfts[0].tokenId
            }
            onSelect={(tokenId) => setTransferTokenId(tokenId)}
          />
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
