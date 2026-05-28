import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGardenDesignLoader, usePublicGardenDesigns } from "@/hooks/useGardenDesigns";
import { calculateYieldLocally } from "@/lib/garden-rules";
import { getForkCount, getLikeCount, getThumbnail, hasLiked, incrementForkCount, toggleLike } from "@/lib/garden-social";
import { useVarieties } from "@/hooks/useNims";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { useGardenDesignMutations } from "@/hooks/useGardenDesigns";
import { designToInput } from "@/lib/garden-candid";
import type { GardenDesign } from "@/lib/garden-types";
import { cloneDesign } from "@/lib/garden-utils";
import { Heart, GitFork, Eye } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function GardenGalleryPage() {
  usePageTitle("Community Garden Gallery");
  const { data: designs = [], isLoading } = usePublicGardenDesigns(0, 50);
  const { data: varieties = [] } = useVarieties();
  const loadDesign = useGardenDesignLoader();
  const { saveMutation } = useGardenDesignMutations();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [, tick] = useState(0);

  const filtered = useMemo(() => {
    if (filter === "all") return designs;
    return designs.filter((d) => d.name.toLowerCase().includes(filter) || d.description?.toLowerCase().includes(filter));
  }, [designs, filter]);

  const forkDesign = async (d: GardenDesign) => {
    if (!isAuthenticated) {
      toast.message("Sign in to fork designs.");
      return;
    }
    const full = d.id != null ? await loadDesign(d.id) : d;
    if (!full) return;
    const copy = cloneDesign(full);
    copy.id = null;
    copy.name = `${full.name} (fork)`;
    copy.description = `Forked from design #${full.id}`;
    copy.isPublic = false;
    try {
      const input = designToInput(copy);
      const id = await saveMutation.mutateAsync(copy);
      if (full.id != null) incrementForkCount(full.id);
      tick((t) => t + 1);
      toast.success("Design forked to your library!");
      void navigate({ to: "/garden", search: { design: id } });
    } catch {
      toast.error("Fork failed");
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">🌿 Community Garden Designs</h1>
          <p className="text-muted-foreground text-sm">Browse, like, and fork public layouts</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/garden">Open Designer</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {["all", "food forest", "pepper", "native", "permaculture"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f.replace(/\b\w/g, (c) => c.toUpperCase())}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No public designs yet. Be the first to share!</p>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map((d) => {
            const id = d.id ?? 0;
            const thumb = id ? getThumbnail(id) : null;
            const yieldEst = calculateYieldLocally(d, varieties);
            return (
              <article
                key={id || d.name}
                className="break-inside-avoid rounded-xl border border-white/10 bg-card/80 overflow-hidden shadow-lg"
              >
                <div className="h-36 bg-gradient-to-br from-green-900 to-green-950 flex items-center justify-center overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🌳</span>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h2 className="font-semibold">{d.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {d.plants.length} plants · {d.structures.length} structures · {d.widthMeters}×{d.depthMeters}m
                  </p>
                  <p className="text-xs">Est. yield: {yieldEst.estimatedLbsMax.toFixed(0)} lbs/yr</p>
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-red-400"
                      onClick={() => {
                        if (id) toggleLike(id);
                        tick((t) => t + 1);
                      }}
                    >
                      <Heart className={`h-4 w-4 ${id && hasLiked(id) ? "fill-red-500 text-red-500" : ""}`} />
                      {id ? getLikeCount(id) : 0}
                    </button>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <GitFork className="h-4 w-4" /> {id ? getForkCount(id) : 0}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/garden" search={{ design: id }}><Eye className="h-4 w-4 mr-1" /> View</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void forkDesign(d)}>
                      <GitFork className="h-4 w-4 mr-1" /> Fork
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
