import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { variantToString } from "@/lib/candid-display";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Value } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import {
  useGetClaimInfo,
  useRedeemClaim,
  useTokenMetadata,
} from "../hooks/useBackend";
import { usePageTitle } from "../hooks/usePageTitle";
import { getNftImageUrl } from "../lib/nft-config";

function PlantPreview({
  variety,
  stage,
  photoUrl,
  tokenId,
}: {
  variety?: string;
  stage?: string;
  photoUrl?: string;
  tokenId: bigint;
}) {
  if (!variety && !stage && !photoUrl) return null;
  const imgSrc = photoUrl
    ? photoUrl.startsWith("http")
      ? photoUrl
      : `/api/object-storage/${photoUrl}`
    : getNftImageUrl(tokenId);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      {imgSrc && (
        <img
          src={imgSrc}
          alt={variety ?? "Plant"}
          className="w-full aspect-video rounded-lg object-cover"
        />
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        {variety && (
          <Badge variant="secondary" className="text-xs">
            {variety}
          </Badge>
        )}
        {stage && (
          <Badge variant="outline" className="text-xs">
            {variantToString(stage)}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-center text-muted-foreground">
        Live plant from IC SPICY Nursery — Port Charlotte, FL
      </p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Rarity Badge ──────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  Common: "bg-zinc-100 text-zinc-700 border-zinc-300",
  Uncommon: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Rare: "bg-purple-100 text-purple-700 border-purple-300",
  Founder: "bg-amber-100 text-amber-700 border-amber-300",
};

function RarityBadge({ rarity }: { rarity: string | null }) {
  if (!rarity) return null;
  const cls =
    RARITY_COLORS[rarity] ?? "bg-zinc-100 text-zinc-700 border-zinc-300";
  return (
    <Badge variant="outline" className={cls}>
      {rarity}
    </Badge>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: `${5 + ((i * 41 + 3) % 90)}%`,
    hue: (i * 67) % 360,
    lum: 0.58 + (i % 5) * 0.06,
    duration: 1.8 + (i % 5) * 0.25,
    delay: (i % 8) * 0.1,
    yEnd: 380 + (i % 5) * 50,
    xDrift: (i % 2 === 0 ? 1 : -1) * (15 + (i % 6) * 12),
    rotate: (i % 2 === 0 ? 1 : -1) * (90 + (i % 7) * 50),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map(
        ({ id, left, hue, lum, duration, delay, yEnd, xDrift, rotate }) => (
          <motion.div
            key={id}
            className="absolute w-2.5 h-2.5 rounded-sm"
            style={{
              left,
              top: "-10px",
              background: `oklch(${lum} 0.25 ${hue})`,
            }}
            initial={{ y: 0, opacity: 1, rotate: 0, x: 0 }}
            animate={{ y: yEnd, opacity: [1, 1, 0], rotate, x: xDrift }}
            transition={{ duration, delay, ease: "easeIn" }}
          />
        ),
      )}
    </div>
  );
}

// ── NFT Image ─────────────────────────────────────────────────────────────────

function NftImage({ tokenId }: { tokenId: bigint }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="aspect-square w-full rounded-2xl bg-muted flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Flame className="h-16 w-16 opacity-30" />
        <span className="text-xs font-mono">#{tokenId.toString()}</span>
      </div>
    );
  }
  return (
    <img
      src={getNftImageUrl(tokenId)}
      alt={`IC SPICY #${tokenId}`}
      className="aspect-square w-full rounded-2xl object-cover bg-muted shadow-lg"
      onError={() => setErrored(true)}
    />
  );
}

// ── Page Shell ────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center select-none">
        <Flame className="mx-auto h-9 w-9 text-red-500 mb-2" />
        <span className="font-display text-xl font-bold tracking-tight text-foreground">
          IC SPICY
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          On-Chain NFT Collection
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClaimPage() {
  usePageTitle("Claim");

  const { claimToken } = useParams({ from: "/claim/$claimToken" });
  const { isAuthenticated, login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: claimInfo, isLoading } = useGetClaimInfo(claimToken);
  const redeem = useRedeemClaim();

  // Secondary: load metadata for rarity badge (non-blocking)
  const tokenIdForMeta = claimInfo?.tokenId ?? null;
  const { data: metadata } = useTokenMetadata(tokenIdForMeta);
  const rarity = getTextField(metadata, "rarity");

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageShell>
        <Card className="border-border bg-card shadow-lg">
          <CardContent className="pt-6 pb-8 space-y-5">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-2/3 mx-auto" />
              <Skeleton className="h-4 w-1/3 mx-auto" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (!claimInfo) {
    return (
      <PageShell>
        <Card className="border-border bg-card shadow-lg">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/60" />
            <p className="font-display font-bold text-lg text-foreground">
              Invalid claim code
            </p>
            <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
              This QR code doesn't match any IC SPICY NFT. Check the sticker and
              try scanning again.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ── Already redeemed (and not currently succeeded in this session) ─────────
  if (claimInfo.redeemed && !redeem.isSuccess) {
    return (
      <PageShell>
        <Card className="border-border bg-card shadow-lg">
          <CardContent className="pt-6 pb-8 space-y-5">
            <NftImage tokenId={claimInfo.tokenId} />
            <div className="text-center space-y-1.5">
              <p className="font-display font-bold text-xl text-foreground">
                {claimInfo.nftName}
              </p>
              <RarityBadge rarity={rarity} />
            </div>
            <PlantPreview
              variety={claimInfo.variety}
              stage={claimInfo.stage}
              photoUrl={claimInfo.photoUrl}
              tokenId={claimInfo.tokenId}
            />
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-center space-y-1.5">
              <CheckCircle2 className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                Already claimed
              </p>
              <p className="text-xs text-muted-foreground">
                This NFT has been claimed by a collector.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full h-12">
              <Link
                to="/nft/$tokenId"
                params={{ tokenId: claimInfo.tokenId.toString() }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View IC SPICY #{claimInfo.tokenId.toString()}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (redeem.isSuccess) {
    const wonTokenId = redeem.data.tokenId ?? claimInfo.tokenId;
    return (
      <PageShell>
        <div className="relative w-full">
          <Confetti />
          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-900/10">
            <CardContent className="pt-6 pb-8 space-y-5">
              <NftImage tokenId={wonTokenId} />
              <div className="text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="font-display font-bold text-xl text-foreground">
                  You now own {claimInfo.nftName}!
                </p>
                <RarityBadge rarity={rarity} />
                <p className="text-xs text-muted-foreground">
                  Your NFT lives on the Internet Computer.
                </p>
              </div>
              <PlantPreview
                variety={claimInfo.variety}
                stage={claimInfo.stage}
                photoUrl={claimInfo.photoUrl}
                tokenId={wonTokenId}
              />
              <Button
                asChild
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                <Link
                  to="/nft/$tokenId"
                  params={{ tokenId: wonTokenId.toString() }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View your NFT
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  // ── Main claim state ───────────────────────────────────────────────────────
  const isPending = isLoggingIn || redeem.isPending;

  async function handleLogin() {
    setIsLoggingIn(true);
    try {
      login();
    } finally {
      // login() navigates away; if it returns synchronously, clear the flag
      setIsLoggingIn(false);
    }
  }

  async function handleClaim() {
    if (!claimToken) return;
    setLocalError(null);
    try {
      await redeem.mutateAsync(claimToken);
      toast.success(`${claimInfo?.nftName ?? "NFT"} is yours!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Claim failed";
      setLocalError(msg);
      toast.error(msg);
    }
  }

  return (
    <PageShell>
      <Card className="border-border bg-card shadow-lg">
        <CardContent className="pt-6 pb-8 space-y-5">
          {/* NFT preview */}
          <NftImage tokenId={claimInfo.tokenId} />

          <div className="text-center space-y-1.5">
            <p className="font-display font-bold text-xl text-foreground">
              {claimInfo.nftName}
            </p>
            {rarity && <RarityBadge rarity={rarity} />}
            <p className="text-xs text-muted-foreground">
              IC SPICY · Internet Computer
            </p>
          </div>

          <PlantPreview
            variety={claimInfo.variety}
            stage={claimInfo.stage}
            photoUrl={claimInfo.photoUrl}
            tokenId={claimInfo.tokenId}
          />

          {/* Error banner */}
          {localError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span className="text-xs text-red-300 leading-relaxed">
                {localError}
              </span>
            </div>
          )}

          {/* Action button */}
          {!isAuthenticated ? (
            <Button
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleLogin}
              disabled={isPending}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Flame className="mr-2 h-4 w-4" />
                  Log in to Claim NFT
                </>
              )}
            </Button>
          ) : (
            <Button
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleClaim}
              disabled={isPending}
            >
              {redeem.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming…
                </>
              ) : localError ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Claim
                </>
              ) : (
                <>
                  <Flame className="mr-2 h-4 w-4" />
                  Claim Your NFT
                </>
              )}
            </Button>
          )}

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            {isAuthenticated
              ? "Your NFT will be transferred to your Internet Identity wallet."
              : "Log in with Internet Identity — no seed phrase, no fees."}
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
