import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Eye,
  EyeOff,
  Link2 as LinkIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Youtube,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { RecipePublic } from "../declarations/backend.did";
import { useSeedDefaultRecipes } from "../hooks/useBackend";
import {
  difficultyLabel,
  recipeCategoryLabel,
  useDeleteRecipeAdmin,
  useListRecipesAdmin,
  usePublishRecipe,
} from "../hooks/useCookbook";
import {
  fetchAllRecipeVideoUrls,
  saveRecipeVideoUrl,
} from "../lib/recipe-video-idl";
import { parseYouTubeId, youTubeThumbnailUrl } from "../lib/youtube";

export default function AdminCookBookTab() {
  const { data: recipes, isPending } = useListRecipesAdmin();
  const seedDefaults = useSeedDefaultRecipes();
  const publish = usePublishRecipe();
  const delRecipe = useDeleteRecipeAdmin();

  const [deleteTarget, setDeleteTarget] = useState<RecipePublic | null>(null);
  const [videoTarget, setVideoTarget] = useState<RecipePublic | null>(null);

  const { data: videoUrls } = useQuery({
    queryKey: ["recipeVideoUrls"],
    queryFn: fetchAllRecipeVideoUrls,
    staleTime: 60 * 1000,
  });

  const sorted = useMemo(() => {
    const list = recipes ?? [];
    return [...list].sort(
      (a, b) => Number(a.display_order) - Number(b.display_order),
    );
  }, [recipes]);

  async function handlePublish(r: RecipePublic) {
    const wasPublished = r.is_published;
    try {
      const ok = await publish.mutateAsync(r.id);
      if (!ok) toast.error("Publish toggle failed.");
      else
        toast.success(
          wasPublished ? "Recipe unpublished." : "Recipe published.",
        );
    } catch {
      toast.error("Publish toggle failed.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const ok = await delRecipe.mutateAsync(deleteTarget.id);
      if (!ok) toast.error("Could not delete recipe.");
      else toast.success(`Removed “${deleteTarget.title}”.`);
    } catch {
      toast.error("Could not delete recipe.");
    }
    setDeleteTarget(null);
  }

  async function seed() {
    try {
      await seedDefaults.mutateAsync();
      toast.success(
        "Recipe seed invoked (skipped if catalog already populated).",
      );
    } catch {
      toast.error("Seed defaults failed.");
    }
  }

  return (
    <div className="space-y-5" data-ocid="admin-cookbook-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            CookBook recipes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            List includes drafts plus published entries. Toggle publish hides or
            reveals public cookbook routes. Deletes are soft (audited on-chain).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border text-xs"
            disabled={seedDefaults.isPending}
            onClick={() => void seed()}
            data-ocid="cookbook-seed-defaults-btn"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${seedDefaults.isPending ? "animate-spin" : ""}`}
            />
            Seed defaults
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="text-sm text-foreground font-medium mb-4">
            No recipes yet
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-border"
            onClick={() => void seed()}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Seed default FPJ starter
          </Button>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="cookbook-recipe-admin-list">
          <div className="hidden lg:grid grid-cols-[1.4fr_auto_auto_auto_auto] gap-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Recipe</span>
            <span>Category</span>
            <span>Difficulty</span>
            <span>Published</span>
            <span className="text-right">Actions</span>
          </div>
          {sorted.map((r) => (
            <RecipeAdminRow
              key={r.id.toString()}
              recipe={r}
              hasVideo={videoUrls?.has(r.id.toString()) ?? false}
              onPublish={() => void handlePublish(r)}
              onDelete={() => setDeleteTarget(r)}
              onVideo={() => setVideoTarget(r)}
              publishBusy={publish.isPending}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">
              Delete &quot;{deleteTarget?.title}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This marks the recipe as deleted in the cookbook registry. Prefer
              unpublish first if you only need to hide content from storefront
              visitors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="cookbook-admin-confirm-delete"
            >
              Delete recipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {videoTarget ? (
        <RecipeVideoDialog
          recipe={videoTarget}
          currentUrl={videoUrls?.get(videoTarget.id.toString()) ?? ""}
          onClose={() => setVideoTarget(null)}
        />
      ) : null}
    </div>
  );
}

function RecipeVideoDialog({
  recipe,
  currentUrl,
  onClose,
}: {
  recipe: RecipePublic;
  currentUrl: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(currentUrl);
  const [saving, setSaving] = useState(false);

  const trimmed = url.trim();
  const videoId = trimmed ? parseYouTubeId(trimmed) : null;
  const invalid = trimmed.length > 0 && !videoId;

  async function save(clear: boolean) {
    setSaving(true);
    try {
      const ok = await saveRecipeVideoUrl(recipe.id, clear ? null : trimmed);
      if (!ok) {
        toast.error("Backend rejected the video update.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["recipeVideoUrls"] });
      await queryClient.invalidateQueries({
        queryKey: ["recipeVideoUrl", recipe.id.toString()],
      });
      toast.success(clear ? "Video removed." : "Video saved.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Video update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display font-bold flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500" />
            Video tutorial — {recipe.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Paste a YouTube URL (watch, youtu.be, or shorts). The recipe page
            shows a lazy-loaded, privacy-enhanced embed above the ingredients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="bg-muted/30 border-border text-sm"
            data-ocid="recipe-video-url-input"
          />
          {invalid ? (
            <p className="text-xs text-destructive">
              That doesn&apos;t look like a YouTube video URL.
            </p>
          ) : null}
          {videoId ? (
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src={youTubeThumbnailUrl(videoId)}
                alt="Video thumbnail preview"
                className="w-full aspect-video object-cover"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {currentUrl ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive text-xs"
              disabled={saving}
              onClick={() => void save(true)}
            >
              Remove video
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="border-border text-xs"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="text-xs"
            disabled={saving || !videoId}
            onClick={() => void save(false)}
            data-ocid="recipe-video-save-btn"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipeAdminRow({
  recipe,
  hasVideo,
  onPublish,
  onDelete,
  onVideo,
  publishBusy,
}: {
  recipe: RecipePublic;
  hasVideo: boolean;
  onPublish: () => void;
  onDelete: () => void;
  onVideo: () => void;
  publishBusy: boolean;
}) {
  return (
    <div className="grid lg:grid-cols-[1.4fr_auto_auto_auto_auto] gap-2 items-center p-3 rounded-xl bg-card border border-border hover:border-primary/35 transition-colors">
      <div className="min-w-0">
        <div className="font-display font-semibold text-foreground text-sm truncate">
          {recipe.title}
        </div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
          <code className="text-primary/85">/{recipe.slug}</code>
          <span className="text-muted-foreground/60">
            {recipe.tags.slice(0, 3).join(" · ") || "no tags"}
          </span>
          <Link
            to="/cookbook/$slug"
            params={{ slug: recipe.slug }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            <LinkIcon className="w-3 h-3" /> Public view
          </Link>
        </div>
      </div>

      <div>
        <Badge
          variant="outline"
          className="text-[10px] border-border whitespace-nowrap"
        >
          {recipeCategoryLabel(recipe.category)}
        </Badge>
      </div>

      <div>
        <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
          {difficultyLabel(recipe.difficulty)}
        </Badge>
      </div>

      <div>
        <Badge
          variant="outline"
          className={
            recipe.is_published
              ? "text-emerald-400 border-emerald-500/35"
              : "text-amber-300 border-amber-500/40"
          }
        >
          {recipe.is_published ? "Live" : "Draft"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 lg:justify-end">
        <Button
          size="sm"
          variant="outline"
          className={`h-8 text-xs border-border ${hasVideo ? "text-red-400 border-red-500/40" : ""}`}
          onClick={onVideo}
          title={hasVideo ? "Edit YouTube tutorial" : "Add YouTube tutorial"}
          data-ocid="recipe-video-btn"
        >
          <Youtube className="w-3.5 h-3.5" />
          <span className="ml-1">{hasVideo ? "Video ✓" : "Video"}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border"
          disabled={publishBusy}
          onClick={onPublish}
          title="Toggle cookbook visibility"
        >
          {recipe.is_published ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          <span className="ml-1">
            {recipe.is_published ? "Unpublish" : "Publish"}
          </span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-destructive hover:text-destructive"
          title="Soft delete recipe"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
