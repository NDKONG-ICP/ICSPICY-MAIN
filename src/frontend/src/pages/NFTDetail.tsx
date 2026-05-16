import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Value } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import {
  useIsPepperHead,
  useIsPepperHeadAvailable,
  usePurchasePepperHead,
  useTokenCertified,
  useTokenMetadata,
  useTokenOwner,
} from "../hooks/useBackend";
import { useICPay } from "../hooks/useICPay";
import { getNftImageUrl, isValidTokenId } from "../lib/nft-config";

// ── Metadata helpers ────────────────────────────────────────────────────────

function valueToString(v: Value): string {
  if ("Text" in v) return v.Text;
  if ("Nat" in v) return v.Nat.toString();
  if ("Int" in v) return v.Int.toString();
  if ("Blob" in v) return `<${v.Blob.length} bytes>`;
  if ("Array" in v) return v.Array.map(valueToString).join(", ");
  if ("Map" in v) return JSON.stringify(v.Map);
  return "";
}

function getTextField(
  metadata: Array<[string, Value]> | null | undefined,
  key: string,
): string | null {
  if (!metadata) return null;
  const entry = metadata.find(([k]) => k === key);
  if (!entry) return null;
  const [, v] = entry;
  return "Text" in v ? v.Text : null;
}

interface ParsedAttribute {
  trait_type: string;
  value: Value;
}

function getAttributesArray(
  metadata: Array<[string, Value]> | null | undefined,
): ParsedAttribute[] {
  if (!metadata) return [];
  const entry = metadata.find(([k]) => k === "attributes");
  if (!entry) return [];
  const [, v] = entry;
  if (!("Array" in v)) return [];
  const out: ParsedAttribute[] = [];
  for (const item of v.Array) {
    if (!("Map" in item)) continue;
    const m = item.Map;
    const traitType = getTextField(m, "trait_type");
    if (!traitType) continue;
    const valueEntry = m.find(([k]) => k === "value");
    if (!valueEntry) continue;
    out.push({ trait_type: traitType, value: valueEntry[1] });
  }
  return out;
}

function truncatePrincipal(p: string, head = 7, tail = 5): string {
  if (p.length <= head + tail + 1) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

function CopyPrincipal({ principal }: { principal: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(principal).then(() => {
      setCopied(true);
      toast.success("Principal copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs break-all">
        {truncatePrincipal(principal)}
      </span>
      <button
        type="button"
        onClick={copy}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Copy principal"
        data-ocid="nft-owner-copy"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}

function bytesToHex(bytes: Uint8Array | number[]): string {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function byteLength(bytes: Uint8Array | number[]): number {
  return bytes instanceof Uint8Array ? bytes.length : bytes.length;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function RarityBadge({ rarity }: { rarity: string | null }) {
  // Tier → Tailwind classes per Q3 spec.
  const colorMap: Record<string, string> = {
    Common: "bg-zinc-100 text-zinc-700",
    Uncommon: "bg-emerald-100 text-emerald-700",
    Rare: "bg-purple-100 text-purple-700",
    Founder: "bg-amber-100 text-amber-700",
  };
  if (!rarity) {
    return (
      <Badge variant="outline" className="bg-zinc-100 text-zinc-700">
        Unknown
      </Badge>
    );
  }
  const cls = colorMap[rarity] ?? "bg-zinc-100 text-zinc-700";
  return (
    <Badge variant="outline" className={cls}>
      {rarity}
    </Badge>
  );
}

function PepperHeadBadge() {
  return (
    <Badge variant="outline" className="bg-red-100 text-red-700 gap-1">
      <Flame className="h-3 w-3" />
      PepperHead
    </Badge>
  );
}

function CertificationBadge({
  loading,
  hasCertificate,
}: {
  loading: boolean;
  hasCertificate: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-9 w-full rounded-md" />;
  }
  if (!hasCertificate) {
    return (
      <div
        className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300"
        data-ocid="nft-cert-unverified"
      >
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>Unverified — no certificate returned</span>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
      data-ocid="nft-cert-verified"
    >
      <ShieldCheck className="h-4 w-4 shrink-0" />
      <span>Verified on-chain</span>
    </div>
  );
}

function HexBlob({
  label,
  bytes,
}: {
  label: string;
  bytes: Uint8Array | number[] | null;
}) {
  const [copied, setCopied] = useState(false);
  const hex = bytes ? bytesToHex(bytes) : "";
  const len = bytes ? byteLength(bytes) : 0;

  function copy() {
    if (!hex) return;
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground font-mono">
          {label} <span className="text-muted-foreground/60">({len} B)</span>
        </span>
        {hex && (
          <button
            type="button"
            onClick={copy}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "copied" : "copy"}
          </button>
        )}
      </div>
      <pre className="text-[10px] font-mono break-all whitespace-pre-wrap bg-muted/40 rounded p-2 max-h-48 overflow-y-auto">
        {hex || "—"}
      </pre>
    </div>
  );
}

function NFTImage({ tokenId, alt }: { tokenId: bigint; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        className="aspect-square w-full rounded-md bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground"
        data-ocid="nft-image-fallback"
      >
        <Flame className="h-12 w-12" />
        <span className="text-sm">Image unavailable</span>
        <span className="text-xs font-mono">#{tokenId.toString()}</span>
      </div>
    );
  }
  return (
    <img
      src={getNftImageUrl(tokenId)}
      alt={alt}
      className="aspect-square w-full rounded-md object-cover bg-muted"
      onError={() => setErrored(true)}
      data-ocid="nft-image"
    />
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground min-w-[110px] shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground text-right break-all">
        {value}
      </span>
    </div>
  );
}

function MetadataCard({
  loading,
  name,
  description,
  ownerText,
  loadingOwner,
  isPepperHead,
  rarity,
}: {
  loading: boolean;
  name: string;
  description: string | null;
  ownerText: string;
  loadingOwner: boolean;
  isPepperHead: boolean;
  rarity: string | null;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-bold">
          Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <InfoRow label="Name" value={name} />
            {description && <InfoRow label="Description" value={description} />}
            <InfoRow
              label="Rarity"
              value={rarity ? <RarityBadge rarity={rarity} /> : "—"}
            />
            <InfoRow
              label="Owner"
              value={
                loadingOwner ? (
                  <Skeleton className="h-4 w-32 inline-block" />
                ) : ownerText ? (
                  <CopyPrincipal principal={ownerText} />
                ) : (
                  "—"
                )
              }
            />
            {isPepperHead && (
              <InfoRow
                label="Membership"
                value={
                  <span className="inline-flex items-center gap-2">
                    <PepperHeadBadge />
                    <span className="text-muted-foreground text-xs">
                      member benefits apply
                    </span>
                  </span>
                }
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TraitsGrid({
  attributes,
  loading,
}: {
  attributes: ParsedAttribute[];
  loading: boolean;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold">
          Traits
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {["t1", "t2", "t3", "t4", "t5", "t6"].map((k) => (
              <Skeleton key={k} className="h-16 rounded-md" />
            ))}
          </div>
        ) : attributes.length === 0 ? (
          <p
            className="text-sm text-muted-foreground py-4 text-center"
            data-ocid="nft-traits-empty"
          >
            No traits to display.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {attributes.map((attr, i) => (
              <motion.div
                key={`${attr.trait_type}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-md border border-border bg-muted/40 px-3 py-2"
                data-ocid={`nft-trait-${i}`}
              >
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {attr.trait_type}
                </p>
                <p className="text-sm font-medium text-foreground truncate">
                  {valueToString(attr.value)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProvenancePlaceholder() {
  return (
    <Card
      className="border-border bg-card border-dashed"
      data-ocid="nft-provenance-placeholder"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold flex items-center gap-2">
          Provenance
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wider"
          >
            Phase 5.5
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Lifecycle telemetry — weather data, growth-stage transitions, and
          farm-to-token timeline — will appear here once the on-chain provenance
          recorder ships in Phase 5.5.
        </p>
      </CardContent>
    </Card>
  );
}

interface CertEnvelope {
  value: Uint8Array | number[] | null;
  certificate: Uint8Array | number[] | null;
  witness: Uint8Array | number[];
}

function LinksCard({
  certified,
  loading,
}: {
  certified: CertEnvelope | null;
  loading: boolean;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold">
          Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* TODO Phase 4: ICPSwap NFT link — verify URL format before enabling */}

        <details
          className="group rounded-md border border-border bg-muted/30 p-2 text-sm"
          data-ocid="nft-cert-envelope"
        >
          <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
            View raw certified envelope
          </summary>
          <div className="mt-3 space-y-3">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : !certified ? (
              <p className="text-xs text-muted-foreground">No envelope.</p>
            ) : (
              <>
                <HexBlob
                  label="value (metadata blob)"
                  bytes={certified.value}
                />
                <HexBlob
                  label="certificate (BLS-signed)"
                  bytes={certified.certificate}
                />
                <HexBlob
                  label="witness (Merkle path)"
                  bytes={certified.witness}
                />
              </>
            )}
          </div>
        </details>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full"
          data-ocid="nft-back-link"
        >
          <Link to="/marketplace">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to collection
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ── PepperHead purchase card ────────────────────────────────────────────────
//
// Shown when the token is a PepperHead AND is still owned by the canister
// (i.e. still in the open pool). Uses ICPay for payment — no wallet
// approval required; ICPay handles crypto/card conversion internally.

const BACKEND_CANISTER_ID: string =
  (import.meta.env.VITE_CANISTER_ID_BACKEND as string | undefined) ??
  "uxrrr-q7777-77774-qaaaq-cai";

function PepperHeadPurchaseCard({
  tokenId,
  ownerPrincipal,
}: {
  tokenId: bigint;
  ownerPrincipal: string;
}) {
  const { data: availableCount, isLoading: loadingAvail } =
    useIsPepperHeadAvailable();
  const purchase = usePurchasePepperHead();
  const { isAuthenticated } = useAuth();
  const [succeeded, setSucceeded] = useState<bigint | null>(null);

  const available = availableCount ?? 0n;
  // Only offer purchase while this specific token is still in the open pool.
  const isInPool = ownerPrincipal === BACKEND_CANISTER_ID;

  const icpay = useICPay({
    onSuccess: async (paymentId) => {
      try {
        const result = await purchase.mutateAsync({ paymentId });
        const mintedId = result.tokenId != null ? BigInt(result.tokenId) : null;
        setSucceeded(mintedId ?? tokenId);
        toast.success(
          mintedId != null
            ? `You now own IC SPICY #${mintedId}!`
            : "PepperHead purchased!",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Purchase failed");
      }
    },
    onError: (msg) => toast.error(msg),
  });

  const isPending =
    icpay.status === "paying" ||
    icpay.status === "confirming" ||
    purchase.isPending;

  if (succeeded != null) {
    return (
      <Card
        className="border-emerald-500/30 bg-emerald-500/5"
        data-ocid="pepperhead-success-card"
      >
        <CardContent className="pt-6 pb-5 text-center space-y-2">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="font-display font-bold text-foreground">
            You now own IC SPICY #{succeeded.toString()}!
          </p>
          <p className="text-xs text-muted-foreground">
            PepperHead membership benefits are now active on this token.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="border-red-500/30 bg-red-500/5"
      data-ocid="pepperhead-purchase-card"
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500" />
          Buy PepperHead — $25
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Remaining in pool</span>
          {loadingAvail ? (
            <Skeleton className="h-5 w-12" />
          ) : (
            <span className="font-bold text-foreground">
              {available.toString()} / 888
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          PepperHead NFTs grant exclusive member benefits — lifetime discounts,
          early access, and provenance rights. Pay with any crypto wallet or
          card via ICPay.
        </p>

        <Separator />

        {icpay.status === "error" && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {icpay.error}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 shrink-0" />
            <span>Log in with Internet Identity to purchase.</span>
          </div>
        ) : !isInPool ? (
          <div className="text-xs text-muted-foreground text-center py-1">
            This PepperHead has already been claimed.
          </div>
        ) : (
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={available === 0n || loadingAvail || isPending}
            onClick={() =>
              icpay.payUsd(25, {
                action: "pepperhead",
                tokenId: tokenId.toString(),
              })
            }
            data-ocid="pepperhead-buy-btn"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {icpay.status === "confirming" || purchase.isPending
                  ? "Confirming on-chain…"
                  : "Awaiting payment…"}
              </>
            ) : available === 0n ? (
              <>
                <Flame className="w-4 h-4" />
                Sold Out
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                Buy PepperHead — $25
              </>
            )}
          </Button>
        )}

        <p className="text-[11px] text-center text-muted-foreground">
          Powered by ICPay · crypto wallet &amp; card accepted
        </p>
      </CardContent>
    </Card>
  );
}

function NotFound({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center py-24 text-center"
      data-ocid="nft-not-found"
    >
      <span className="text-6xl mb-4">🌶️</span>
      <h3 className="font-display text-2xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm px-4">{message}</p>
      <Button asChild variant="outline">
        <Link to="/marketplace">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to collection
        </Link>
      </Button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function NFTDetailPage() {
  const { tokenId: rawId } = useParams({ from: "/nft/$tokenId" });
  // Validate BEFORE calling hooks. isValidTokenId returns null for "0",
  // "9999", "abc", floats, hex, etc. — the four ICRC hooks then short-
  // circuit via their `enabled` gate, never firing a network call.
  const id = isValidTokenId(rawId);

  const { data: metadata, isLoading: loadingMetadata } = useTokenMetadata(id);
  const { data: owner, isLoading: loadingOwner } = useTokenOwner(id);
  const { data: isPepperHead } = useIsPepperHead(id);
  const { data: certified, isLoading: loadingCertified } =
    useTokenCertified(id);

  if (id === null) {
    return (
      <NotFound
        title="Invalid Token ID"
        message={
          rawId
            ? `"${rawId}" is not a valid token id. Token IDs are integers between 1 and 8888.`
            : "No token id provided."
        }
      />
    );
  }

  // Token never minted → owner resolved to null after load.
  if (!loadingOwner && owner === null) {
    return (
      <NotFound
        title="Token Not Found"
        message={`Token #${id.toString()} hasn't been minted yet.`}
      />
    );
  }

  const name = getTextField(metadata, "name") ?? `IC SPICY #${id.toString()}`;
  const description = getTextField(metadata, "description");
  const rarity = getTextField(metadata, "rarity");
  const attributes = getAttributesArray(metadata);
  const ownerText = owner?.owner.toString() ?? "";

  return (
    <div className="min-h-screen bg-background" data-ocid="nft-detail">
      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            data-ocid="nft-back-btn"
          >
            <Link to="/marketplace">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to collection
            </Link>
          </Button>

          <div className="flex flex-wrap items-start gap-3">
            <Flame className="mt-1 h-7 w-7 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="font-display text-3xl font-bold text-foreground leading-tight">
                  {name}
                </h1>
                <RarityBadge rarity={rarity} />
                {isPepperHead && <PepperHeadBadge />}
              </div>
              <p className="text-muted-foreground font-mono text-sm">
                Token #{id.toString()} of 8888
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT: hero image, certification, links */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-border bg-card">
              <CardContent className="p-3">
                <NFTImage tokenId={id} alt={name} />
              </CardContent>
            </Card>

            <CertificationBadge
              loading={loadingCertified}
              hasCertificate={!!certified?.certificate}
            />

            <LinksCard
              certified={certified ?? null}
              loading={loadingCertified}
            />
          </div>

          {/* RIGHT: metadata, traits, provenance placeholder */}
          <div className="lg:col-span-2 space-y-4">
            <MetadataCard
              loading={loadingMetadata}
              name={name}
              description={description}
              ownerText={ownerText}
              loadingOwner={loadingOwner}
              isPepperHead={!!isPepperHead}
              rarity={rarity}
            />

            <TraitsGrid attributes={attributes} loading={loadingMetadata} />

            {isPepperHead && (
              <PepperHeadPurchaseCard
                tokenId={id}
                ownerPrincipal={ownerText}
              />
            )}

            <ProvenancePlaceholder />
          </div>
        </div>
      </div>
    </div>
  );
}
