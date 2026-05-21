import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bot,
  Flame,
  Heart,
  Loader2,
  Printer,
  Share2,
  ShieldAlert,
} from "lucide-react";
import { motion } from "motion/react";
import { Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Ingredient } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import {
  difficultyLabel,
  recipeCategoryLabel,
  useRecipesByIds,
  useRecipeBySlug,
  useToggleFavorite,
} from "../hooks/useCookbook";

function IngredientLine({ ing }: { ing: Ingredient }) {
  const note = ing.notes.length ? ing.notes[0] ?? "" : "";
  return (
    <li className="text-sm leading-relaxed flex gap-2">
      <span className="text-primary font-semibold whitespace-nowrap">
        {ing.amount}
      </span>
      <span className="text-foreground">
        {ing.name}
        {ing.is_optional ? (
          <span className="text-muted-foreground text-xs ml-1">(optional)</span>
        ) : null}
        {note ? (
          <span className="block text-muted-foreground text-xs mt-0.5">{note}</span>
        ) : null}
      </span>
    </li>
  );
}

export default function CookbookRecipeDetailPage() {
  const { slug: slugParam } = useParams({ from: "/cookbook/$slug" });

  const { isAuthenticated } = useAuth();
  const slugDecoded = slugParam ? decodeURIComponent(slugParam) : "";

  const { data: recipe, isPending } = useRecipeBySlug(slugDecoded);
  const relatedIds = recipe?.related_recipe_ids ?? [];
  const relatedQ = useRecipesByIds([...relatedIds]);
  const favoriteMut = useToggleFavorite();

  const sortedSteps = useMemo(() => {
    const steps = recipe?.steps ? [...recipe.steps] : [];
    steps.sort((a, b) => Number(a.step_number) - Number(b.step_number));
    return steps;
  }, [recipe?.steps]);

  async function handleShare() {
    if (!recipe) return;
    const url = `${window.location.origin}/cookbook/${encodeURIComponent(recipe.slug)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, url });
        return;
      } catch {
        /* fallback */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Share / clipboard unavailable");
    }
  }

  async function handleFavoriteToggle() {
    if (!recipe) return;
    if (!isAuthenticated) {
      toast.message("Sign in to save favorites.", {
        description: "Use Internet Identity, then tap the heart again.",
      });
      return;
    }
    try {
      await favoriteMut.mutateAsync(recipe.id);
    } catch {
      toast.error("Favorite update failed");
    }
  }

  function printRecipe() {
    window.requestAnimationFrame(() => window.print());
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" aria-busy>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-70" />
        <h1 className="font-display font-bold text-2xl mb-3">Recipe not found</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Slug &quot;{slugDecoded}&quot; doesn&apos;t match a published recipe.
        </p>
        <Button asChild variant="outline" className="border-border">
          <Link to="/cookbook">Back to cookbook</Link>
        </Button>
      </div>
    );
  }

  const heroKey = recipe.image_key.length ? recipe.image_key[0] : null;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cookbook-print-root, #cookbook-print-root * {
            visibility: visible !important;
          }
          #cookbook-print-root {
            position: absolute; left: 0; top: 0;
            width: 100%; background: white; color: #111 !important;
            padding: 0.75in;
          }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 pb-20 print:hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex flex-wrap items-center gap-3 mb-6 mt-6">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2">
              <Link to="/cookbook" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Cookbook
              </Link>
            </Button>
          </div>

          <article className="rounded-3xl border border-border/70 bg-card/55 overflow-hidden">
            <div className="relative aspect-[21/11] md:aspect-[21/9] bg-muted/40 border-b border-border/60">
              {heroKey ? (
                <img
                  src={`/api/object-storage/${heroKey}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-transparent">
                  <Flame className="w-20 h-20 text-primary opacity-70" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-95" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                    {recipeCategoryLabel(recipe.category)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                    {difficultyLabel(recipe.difficulty)}
                  </Badge>
                  {recipe.favorite_count > 0n ? (
                    <Badge variant="outline" className="text-[10px] border-border">
                      ♥ {recipe.favorite_count.toString()} saves
                    </Badge>
                  ) : null}
                </div>
                <h1 className="font-display font-black text-3xl md:text-4xl text-foreground leading-tight">
                  {recipe.title}
                </h1>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {recipe.description}
              </p>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {recipe.prep_time.length ? (
                  <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Prep
                    </dt>
                    <dd className="font-medium">{recipe.prep_time[0]}</dd>
                  </div>
                ) : null}
                {recipe.fermentation_time.length ? (
                  <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Fermentation
                    </dt>
                    <dd className="font-medium">{recipe.fermentation_time[0]}</dd>
                  </div>
                ) : null}
                {recipe.total_time.length ? (
                  <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Total time
                    </dt>
                    <dd className="font-medium">{recipe.total_time[0]}</dd>
                  </div>
                ) : null}
                {recipe.application_rate.length ? (
                  <div className="rounded-xl border border-border/60 bg-background/35 p-3">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Application rate
                    </dt>
                    <dd className="font-medium">{recipe.application_rate[0]}</dd>
                  </div>
                ) : null}
                {recipe.application_frequency.length ? (
                  <div className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Frequency
                    </dt>
                    <dd className="font-medium">{recipe.application_frequency[0]}</dd>
                  </div>
                ) : null}
              </dl>

              {recipe.best_for.length ? (
                <section>
                  <h2 className="font-display font-bold text-lg mb-2">Best for</h2>
                  <div className="flex flex-wrap gap-2">
                    {recipe.best_for.map((b) => (
                      <Badge key={b} variant="secondary" className="border border-border">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  onClick={() => void handleFavoriteToggle()}
                  disabled={favoriteMut.isPending}
                >
                  <Heart
                    className={`w-4 h-4 mr-2 ${recipe.caller_favorited ? "fill-current text-red-400" : ""}`}
                  />
                  {recipe.caller_favorited ? "Saved" : "Save"}
                </Button>
                <Button size="sm" variant="outline" className="border-border" onClick={() => void handleShare()}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button size="sm" variant="outline" className="border-border" onClick={printRecipe}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="opacity-70 cursor-not-allowed"
                  type="button"
                  disabled
                  title="Coming with SpicyAI Phase 8 wiring"
                  data-ocid="cookbook-spicyai-placeholder"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Ask SpicyAI
                </Button>
              </div>

              <section className="grid md:grid-cols-5 gap-8">
                <div className="md:col-span-2">
                  <h2 className="font-display font-bold text-xl mb-3 text-primary">
                    Ingredients
                  </h2>
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ing, idx) => (
                      <IngredientLine key={`${recipe.id}-${String(idx)}`} ing={ing} />
                    ))}
                  </ul>
                </div>
                <div className="md:col-span-3">
                  <h2 className="font-display font-bold text-xl mb-3 text-primary">
                    Steps
                  </h2>
                  <ol className="space-y-5">
                    {sortedSteps.map((step, idx) => {
                      const tip = step.tips.length ? step.tips[0] : "";
                      const duration = step.duration.length ? step.duration[0] : "";
                      const stepKey = `${recipe.slug}-step-${String(step.step_number ?? idx)}`;
                      return (
                        <li
                          key={stepKey}
                          className="border-l-2 border-primary/40 pl-4 space-y-1"
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-display font-black text-xl text-primary">
                              {step.step_number.toString()}.
                            </span>
                            {duration ? (
                              <Badge variant="outline" className="text-[10px] border-border">
                                {duration}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm leading-relaxed text-foreground">
                            {step.instruction}
                          </p>
                          {tip ? (
                            <p className="text-xs text-muted-foreground italic border border-dashed border-border/70 rounded-lg p-2 mt-2 bg-muted/20">
                              Tip: {tip}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </section>

              {recipe.tips.length ? (
                <section>
                  <h2 className="font-display font-bold text-xl mb-2">Tips</h2>
                  <ul className="list-disc ml-6 space-y-2 text-sm text-muted-foreground">
                    {recipe.tips.map((t, i) => (
                      <li key={`tip-${recipe.id}-${String(i)}`}>{t}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {recipe.safety_notes.length ? (
                <section className="rounded-2xl border border-red-500/35 bg-red-500/10 p-5 space-y-2">
                  <h2 className="font-display font-bold text-xl text-red-200 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    Safety & handling
                  </h2>
                  <ul className="space-y-2 text-sm">
                    {recipe.safety_notes.map((sn, i) => (
                      <li key={`safe-${recipe.id}-${String(i)}`}>{sn}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {recipe.tags.length ? (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border/55">
                  {recipe.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      #{t}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {relatedQ.recipes.length > 0 ? (
                <section className="pt-4 border-t border-border/55">
                  <h2 className="font-display font-bold text-xl mb-4">
                    Related recipes
                  </h2>
                  {relatedQ.isLoading ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading related…
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {relatedQ.recipes.map((r) => (
                        <Link
                          key={r.id.toString()}
                          to="/cookbook/$slug"
                          params={{ slug: r.slug }}
                          className="block rounded-xl border border-border/65 bg-muted/15 hover:border-primary/40 p-4 transition-colors"
                        >
                          <span className="font-display font-bold text-base text-foreground line-clamp-2">
                            {r.title}
                          </span>
                          <span className="text-xs text-muted-foreground mt-2 line-clamp-2 block">
                            {r.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          </article>
        </motion.div>
      </div>

      <div id="cookbook-print-root" className="hidden print:block">
        <div className="max-w-[7in] mx-auto font-serif space-y-4">
          <div className="border-b pb-4 border-neutral-900">
            <div className="text-[11px] tracking-[3px] text-red-800 font-bold uppercase">
              IC SPICY — Natural Farming CookBook
            </div>
            <h1 className="text-4xl font-black mt-2 text-neutral-950">{recipe.title}</h1>
            <p className="text-sm mt-2 text-neutral-700">
              {recipeCategoryLabel(recipe.category)} · {difficultyLabel(recipe.difficulty)}
            </p>
          </div>
          <p className="text-sm text-neutral-800">{recipe.description}</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs uppercase tracking-[2px] text-red-800 font-black mb-2">
                Ingredients
              </h3>
              <ul className="text-xs space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={`p-${recipe.id}-${String(i)}`}>
                    <strong>{ing.amount}</strong> {ing.name}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[2px] text-red-800 font-black mb-2">
                Steps
              </h3>
              <ol className="text-xs space-y-2 list-decimal pl-5">
                {sortedSteps.map((step, idx) => (
                  <li key={`ps-${recipe.id}-${String(step.step_number ?? idx)}`}>
                    {step.instruction}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="text-[10px] text-neutral-500 border-t pt-3 flex justify-between">
            <span>Printed {new Date().toLocaleString()}</span>
            <span>icspicy.farm · {recipe.slug}</span>
          </div>
        </div>
      </div>
    </>
  );
}
