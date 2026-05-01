import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Flame,
  FlaskConical,
  Lock,
  Share2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { NFTStandard, PlantStage } from "../backend";
import type { FeedingPublic, PlantTimeline } from "../backend";
import { StageBadge } from "../components/ui/StageBadge";
import { usePlant, usePlantTimeline } from "../hooks/useBackend";
import { SOCIAL_LINKS } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(ts: bigint | undefined): string {
  if (ts == null) return "—";
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShortDate(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(s: string, n = 20): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground min-w-[120px] shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground text-right break-all">
        {value}
      </span>
    </div>
  );
}

function PhotoGallery({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold flex items-center gap-2">
          <span className="text-primary">📷</span> Photos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((key) => (
            <div
              key={key}
              className="aspect-square rounded-md overflow-hidden bg-muted border border-border"
            >
              <img
                src={`/api/object-storage/${key}`}
                alt="Chili plant captured at growth stage"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineView({ timeline }: { timeline: PlantTimeline }) {
  const { plant, stage_history } = timeline;

  type TimelineEvent = {
    ts: bigint;
    label: string;
    note?: string;
    dotClass: string;
  };

  const events: TimelineEvent[] = [
    {
      ts: plant.planting_date,
      label: "🌱 Planted",
      note: plant.genetics ? `Genetics: ${plant.genetics}` : undefined,
      dotClass: "border-amber-600 bg-amber-950/50",
    },
  ];

  if (plant.germination_date != null) {
    events.push({
      ts: plant.germination_date,
      label: "🌿 Germinated",
      dotClass: "border-emerald-600 bg-emerald-950/50",
    });
  }

  const stageLabelMap: Record<PlantStage, string> = {
    [PlantStage.Seed]: "🌱 Seed Stage",
    [PlantStage.Seedling]: "🪴 Seedling Stage",
    [PlantStage.Mature]: "🌶️ Mature Stage",
  };

  for (const sh of stage_history) {
    events.push({
      ts: sh.timestamp,
      label: stageLabelMap[sh.stage] ?? `Stage: ${sh.stage}`,
      note: sh.notes || undefined,
      dotClass: "border-primary/60 bg-primary/20",
    });
  }

  if (plant.transplant_date != null) {
    events.push({
      ts: plant.transplant_date,
      label: "🪴 Transplanted",
      dotClass: "border-emerald-700/60 bg-emerald-950/30",
    });
  }

  if (plant.sold) {
    events.push({
      ts: plant.planting_date,
      label: "🏷️ Sold — Plant Locked",
      dotClass: "border-muted-foreground/40 bg-muted/30",
    });
  }

  events.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" /> Growth Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol
          className="relative border-l border-border ml-3 space-y-6"
          data-ocid="plant-timeline"
        >
          {events.map((ev, i) => (
            <motion.li
              key={`${ev.ts.toString()}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="ml-6"
            >
              <span
                className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 ${ev.dotClass}`}
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-display text-sm font-semibold text-foreground leading-tight">
                  {ev.label}
                </p>
                <time className="text-xs text-muted-foreground font-mono">
                  {fmtShortDate(ev.ts)}
                </time>
              </div>
              {ev.note && (
                <p className="mt-1 text-xs text-muted-foreground">{ev.note}</p>
              )}
            </motion.li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function FeedingTable({ feedings }: { feedings: FeedingPublic[] }) {
  const sorted = [...feedings].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" /> Feeding History
          {feedings.length > 0 && (
            <Badge variant="outline" className="text-xs ml-1">
              {feedings.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No feeding records yet.
          </p>
        ) : (
          <div className="overflow-x-auto" data-ocid="feeding-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">
                    Date
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Nutrient
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                    Dosage
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f) => (
                  <tr
                    key={f.id.toString()}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {fmtShortDate(f.date)}
                    </td>
                    <td className="py-2 pr-4 font-medium text-foreground">
                      {f.product_name}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {f.nutrient_type}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-foreground">
                      {f.dosage_amount}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {f.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShareButtons({ plantId }: { plantId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/plants/${plantId}`;
  const text = "Check out this IC SPICY chili plant! 🌶️";

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shares = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "X / Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "Instagram",
      href: SOCIAL_LINKS.instagram,
    },
    {
      label: "TikTok",
      href: SOCIAL_LINKS.tiktok,
    },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-bold flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" /> Share This Plant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {shares.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted hover:text-foreground"
              data-ocid={`share-${s.label.toLowerCase().replace(/[\s/]/g, "-")}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {s.label}
            </a>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyLink}
          className="gap-2 border-border hover:border-primary hover:text-primary"
          data-ocid="share-copy-link"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlantDetailPage() {
  const { plantId } = useParams({ from: "/plants/$plantId" });
  const id = BigInt(plantId);

  const { data: plant, isLoading: loadingPlant } = usePlant(id);
  const { data: timeline, isLoading: loadingTimeline } = usePlantTimeline(id);

  if (loadingPlant) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div
        className="min-h-screen bg-background flex flex-col items-center justify-center py-24 text-center"
        data-ocid="plant-detail-not-found"
      >
        <span className="text-6xl mb-4">🌶️</span>
        <h3 className="font-display text-2xl font-bold text-foreground mb-2">
          Plant Not Found
        </h3>
        <p className="text-muted-foreground mb-6">
          This plant doesn&apos;t exist or may have been removed.
        </p>
        <Button asChild variant="outline">
          <Link to="/plants">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plants
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-ocid="plant-detail">
      {/* Page header */}
      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            data-ocid="plant-back-btn"
          >
            <Link to="/plants">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Plants
            </Link>
          </Button>

          <div className="flex flex-wrap items-start gap-3">
            <Flame className="mt-1 h-7 w-7 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="font-display text-3xl font-bold text-foreground leading-tight">
                  {plant.variety}
                </h1>
                <StageBadge stage={plant.stage} />
              </div>
              <p className="text-muted-foreground font-mono text-sm">
                Tray #{plant.tray_id.toString()} · Cell{" "}
                {plant.cell_position.toString()}
                {plant.genetics && (
                  <span className="ml-2 text-foreground/60">
                    · {plant.genetics}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Sold banner */}
          {plant.sold && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 rounded-md border border-muted-foreground/30 bg-muted/40 px-4 py-3"
              data-ocid="plant-sold-banner"
            >
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm font-medium text-muted-foreground">
                Sold — Plant locked. Lifecycle evolution disabled.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: metadata + share */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Plant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow label="Variety" value={plant.variety} />
                <InfoRow
                  label="Stage"
                  value={<StageBadge stage={plant.stage} />}
                />
                <InfoRow label="Planted" value={fmtDate(plant.planting_date)} />
                <InfoRow
                  label="Germinated"
                  value={fmtDate(plant.germination_date)}
                />
                <InfoRow
                  label="Transplanted"
                  value={fmtDate(plant.transplant_date)}
                />
                {plant.nft_id != null && (
                  <InfoRow
                    label="NFT ID"
                    value={
                      <span className="font-mono text-xs text-primary break-all">
                        {truncate(plant.nft_id, 24)}
                      </span>
                    }
                  />
                )}
                <InfoRow
                  label="NFT Standard"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        plant.nft_standard === NFTStandard.Hedera
                          ? "border-purple-700/50 text-purple-400"
                          : "border-blue-700/50 text-blue-400"
                      }
                    >
                      {plant.nft_standard}
                    </Badge>
                  }
                />
                {plant.notes && (
                  <>
                    <Separator className="my-2" />
                    <div className="py-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-foreground">{plant.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <ShareButtons plantId={plantId} />
          </div>

          {/* Right column: photos, timeline, feedings */}
          <div className="lg:col-span-2 space-y-4">
            {plant.photos.length > 0 && <PhotoGallery photos={plant.photos} />}

            {loadingTimeline ? (
              <>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </>
            ) : timeline ? (
              <>
                <TimelineView timeline={timeline} />
                <FeedingTable feedings={timeline.feedings} />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
