import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { Flame, Leaf } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { PlantStage } from "../backend";
import { StageBadge } from "../components/ui/StageBadge";
import { usePlants } from "../hooks/useBackend";
import type { Plant } from "../types";

type FilterValue = "all" | PlantStage;

const STAGE_TABS: { label: string; value: FilterValue; emoji: string }[] = [
  { label: "All Plants", value: "all", emoji: "🌶️" },
  { label: "Germinated Seeds", value: PlantStage.Seed, emoji: "🌱" },
  { label: "Seedlings", value: PlantStage.Seedling, emoji: "🌿" },
  { label: "Mature Plants", value: PlantStage.Mature, emoji: "🔥" },
];

function formatDate(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateNftId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-6)}`;
}

function PlantCard({ plant, index }: { plant: Plant; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card
        data-ocid="plant-card"
        className="group relative overflow-hidden border-border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 flex flex-col h-full"
      >
        {/* Flame accent bar */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-bold leading-tight text-foreground min-w-0 truncate">
              {plant.variety}
            </h3>
            <StageBadge stage={plant.stage} className="shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Tray #{plant.tray_id.toString()} · Cell{" "}
            {plant.cell_position.toString()}
          </p>
        </CardHeader>

        <CardContent className="pb-3 space-y-2 flex-1">
          {plant.genetics && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              <span className="text-foreground/60 font-medium">Genetics: </span>
              {plant.genetics}
            </p>
          )}
          {plant.germination_date != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Germinated:</span>
              <span className="text-xs font-medium text-foreground">
                {formatDate(plant.germination_date)}
              </span>
            </div>
          )}
          {plant.nft_id != null && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-xs font-mono px-1.5 py-0 border-primary/30 text-primary/80"
              >
                NFT: {truncateNftId(plant.nft_id)}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 border-border text-muted-foreground"
              >
                {plant.nft_standard}
              </Badge>
            </div>
          )}
          {plant.sold && (
            <Badge className="bg-muted text-muted-foreground border border-border text-xs">
              Sold
            </Badge>
          )}
        </CardContent>

        <CardFooter className="pt-0 pb-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full border-border hover:border-primary hover:text-primary transition-colors"
            data-ocid="plant-view-details"
          >
            <Link
              to="/plants/$plantId"
              params={{ plantId: plant.id.toString() }}
            >
              View Details
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function PlantCardSkeleton() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-24 mt-1" />
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-32" />
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <Skeleton className="h-8 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function PlantsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const { data: plants, isLoading } = usePlants();

  const stageCounts = useMemo(() => {
    if (!plants) return {} as Record<string, number>;
    const counts: Record<string, number> = { all: plants.length };
    for (const p of plants) {
      counts[p.stage] = (counts[p.stage] ?? 0) + 1;
    }
    return counts;
  }, [plants]);

  const filtered = useMemo(() => {
    if (!plants) return [];
    if (activeFilter === "all") return plants;
    return plants.filter((p) => p.stage === activeFilter);
  }, [plants, activeFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Flame className="h-7 w-7 text-primary" />
              <h1 className="font-display text-3xl font-bold text-foreground">
                Our Chili Plants
              </h1>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Browse our living inventory of rare and ultra-hot chilies — each
              plant is individually tracked with NFT provenance.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stage filter tabs */}
      <div className="bg-card/50 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="flex gap-1 overflow-x-auto py-3 scrollbar-none"
            data-ocid="stage-filter-tabs"
          >
            {STAGE_TABS.map(({ label, value, emoji }) => {
              const count = stageCounts[value] ?? 0;
              const isActive = activeFilter === value;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setActiveFilter(value)}
                  data-ocid={`stage-tab-${value}`}
                  className={[
                    "flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span
                    className={[
                      "ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => i).map((i) => (
              <PlantCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
            data-ocid="plants-empty-state"
          >
            <Leaf className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              No plants here yet
            </h3>
            <p className="text-muted-foreground max-w-sm">
              {activeFilter === "all"
                ? "No plants have been added to the system yet. Check back soon!"
                : `No ${activeFilter} stage plants available right now.`}
            </p>
          </motion.div>
        ) : (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-ocid="plant-list"
          >
            {filtered.map((plant, i) => (
              <PlantCard key={plant.id.toString()} plant={plant} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
