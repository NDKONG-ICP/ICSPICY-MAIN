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
import { Textarea } from "@/components/ui/textarea";
import {
  fetchRecipeSeoContent,
  saveRecipeBonsaiVideo,
  saveRecipeFaqs,
  saveRecipeIntro,
} from "../lib/recipe-video-idl";
import { bonsaiTubeEmbedUrl } from "../lib/bonsai-tube";

export default function AdminCookBookTab() {
  const { data: recipes, isPending } = useListRecipesAdmin();
  const seedDefaults = useSeedDefaultRecipes();
  const publish = usePublishRecipe();
  const delRecipe = useDeleteRecipeAdmin();

  const [deleteTarget, setDeleteTarget] = useState<RecipePublic | null>(null);
  const [videoTarget, setVideoTarget] = useState<RecipePublic | null>(null);
  const [seoTarget, setSeoTarget] = useState<RecipePublic | null>(null);
  const queryClient = useQueryClient();

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
              hasBonsaiVideo={
                r.bonsaiVideoId.length > 0 && Boolean(r.bonsaiVideoId[0])
              }
              onPublish={() => void handlePublish(r)}
              onDelete={() => setDeleteTarget(r)}
              onVideo={() => setVideoTarget(r)}
              onSeo={() => setSeoTarget(r)}
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
        <RecipeBonsaiVideoDialog
          recipe={videoTarget}
          currentId={videoTarget.bonsaiVideoId[0] ?? ""}
          onClose={() => setVideoTarget(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["cookbook"] });
          }}
        />
      ) : null}

      {seoTarget ? (
        <RecipeSeoDialog
          recipe={seoTarget}
          onClose={() => setSeoTarget(null)}
        />
      ) : null}
    </div>
  );
}

function RecipeSeoDialog({
  recipe,
  onClose,
}: {
  recipe: RecipePublic;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [intro, setIntro] = useState("");
  const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>([
    { q: "", a: "" },
    { q: "", a: "" },
    { q: "", a: "" },
  ]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: current } = useQuery({
    queryKey: ["recipeSeoContent", recipe.id.toString()],
    queryFn: () => fetchRecipeSeoContent(recipe.id),
    staleTime: 0,
  });

  if (current && !loaded) {
    setIntro(current.intro ?? "");
    if (current.faqs.length > 0) {
      setFaqs(
        [0, 1, 2].map((i) => ({
          q: current.faqs[i]?.[0] ?? "",
          a: current.faqs[i]?.[1] ?? "",
        })),
      );
    }
    setLoaded(true);
  }

  async function save() {
    setSaving(true);
    try {
      const cleanFaqs = faqs
        .filter((f) => f.q.trim() && f.a.trim())
        .map((f) => [f.q.trim(), f.a.trim()] as [string, string]);
      const okIntro = await saveRecipeIntro(recipe.id, intro.trim());
      const okFaqs = await saveRecipeFaqs(recipe.id, cleanFaqs);
      if (!okIntro || !okFaqs) {
        toast.error("Backend rejected the SEO update.");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["recipeSeoContent", recipe.id.toString()],
      });
      toast.success("SEO content saved.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "SEO update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display font-bold">
            SEO content — {recipe.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Unique intro paragraph + Common Questions shown on the recipe page
            and in the prerendered HTML / FAQPage schema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              Intro paragraph (2–3 sentences)
            </p>
            <Textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Why this recipe matters, what it does for the soil/plant, when to use it…"
              className="text-sm bg-muted/30 border-border resize-none"
            />
          </div>

          {faqs.map((f, i) => (
            <div
              key={`seo-faq-${String(i)}`}
              className="space-y-1.5 rounded-xl border border-border/60 p-3"
            >
              <Input
                value={f.q}
                onChange={(e) =>
                  setFaqs((prev) =>
                    prev.map((p, j) =>
                      j === i ? { ...p, q: e.target.value } : p,
                    ),
                  )
                }
                maxLength={300}
                placeholder={`Question ${String(i + 1)}`}
                className="text-sm bg-muted/30 border-border"
              />
              <Textarea
                value={f.a}
                onChange={(e) =>
                  setFaqs((prev) =>
                    prev.map((p, j) =>
                      j === i ? { ...p, a: e.target.value } : p,
                    ),
                  )
                }
                rows={3}
                maxLength={2000}
                placeholder="Answer"
                className="text-sm bg-muted/30 border-border resize-none"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-border text-xs"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="text-xs"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save SEO content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipeBonsaiVideoDialog({
  recipe,
  currentId,
  onClose,
  onSaved,
}: {
  recipe: RecipePublic;
  currentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [videoId, setVideoId] = useState(currentId);
  const [saving, setSaving] = useState(false);

  const trimmed = videoId.trim();
  const invalid =
    trimmed.length > 0 && !/^[A-Za-z0-9_-]{1,20}$/.test(trimmed);

  async function save(clear: boolean) {
    setSaving(true);
    try {
      await saveRecipeBonsaiVideo(recipe.id, clear ? null : trimmed);
      onSaved();
      toast.success(clear ? "BonsaiTube video removed." : "BonsaiTube video saved.");
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
            <Youtube className="w-4 h-4 text-orange-500" />
            BonsaiTube how-to — {recipe.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Enter the BonsaiTube video id only (e.g.{" "}
            <code className="text-primary">31</code>). The recipe page lazy-loads
            the embed from{" "}
            <code className="text-xs">f65cr-…raw.icp0.io/embed/…</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="31"
            className="bg-muted/30 border-border text-sm font-mono"
            data-ocid="recipe-bonsai-video-id-input"
          />
          {invalid ? (
            <p className="text-xs text-destructive">
              Use 1–20 alphanumeric characters (e.g. 31).
            </p>
          ) : null}
          {trimmed && !invalid ? (
            <p className="text-[11px] text-muted-foreground break-all">
              Preview URL: {bonsaiTubeEmbedUrl(trimmed)}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {currentId ? (
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
            disabled={saving || invalid || trimmed.length === 0}
            onClick={() => void save(false)}
            data-ocid="recipe-bonsai-video-save-btn"
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
  hasBonsaiVideo,
  onPublish,
  onDelete,
  onVideo,
  onSeo,
  publishBusy,
}: {
  recipe: RecipePublic;
  hasBonsaiVideo: boolean;
  onPublish: () => void;
  onDelete: () => void;
  onVideo: () => void;
  onSeo: () => void;
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
          className={`h-8 text-xs border-border ${hasBonsaiVideo ? "text-orange-400 border-orange-500/40" : ""}`}
          onClick={onVideo}
          title={
            hasBonsaiVideo ? "Edit BonsaiTube how-to" : "Add BonsaiTube how-to"
          }
          data-ocid="recipe-video-btn"
        >
          <Youtube className="w-3.5 h-3.5" />
          <span className="ml-1">{hasBonsaiVideo ? "Video ✓" : "Video"}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border"
          onClick={onSeo}
          title="Edit intro paragraph + Common Questions"
          data-ocid="recipe-seo-btn"
        >
          SEO
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
