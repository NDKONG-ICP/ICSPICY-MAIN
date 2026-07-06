import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  Heart,
  Loader2,
  Printer,
  Share2,
  ShieldAlert,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Seo } from "../components/Seo";
import { openSpicyAi } from "../components/SpicyAiWidget";
import { YouTubeEmbed } from "../components/YouTubeEmbed";
import type { Ingredient } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import {
  difficultyLabel,
  recipeCategoryLabel,
  useGetRecipes,
  useRecipeBySlug,
  useRecipeQuery,
  useRecipesByIds,
  useToggleFavorite,
} from "../hooks/useCookbook";
import {
  fetchRecipeSeoContent,
  fetchRecipeVideoUrl,
} from "../lib/recipe-video-idl";
import {
  faqPageJsonLd,
  recipeBreadcrumbJsonLd,
  recipeSeoMeta,
} from "../lib/seo-routes.mjs";
import { parseYouTubeId, youTubeThumbnailUrl } from "../lib/youtube";

function IngredientLine({ ing }: { ing: Ingredient }) {
  const note = ing.notes.length ? (ing.notes[0] ?? "") : "";
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
          <span className="block text-muted-foreground text-xs mt-0.5">
            {note}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export default function CookbookRecipeDetailPage() {
  const { slug: slugParam } = useParams({ from: "/cookbook/$slug" });
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();
  const slugDecoded = slugParam ? decodeURIComponent(slugParam) : "";

  // Old links used numeric IDs (/cookbook/12). Resolve those by ID, then
  // canonicalize: replace the URL with the slug so crawlers and shares
  // converge on one canonical address.
  const isNumericParam = /^\d+$/.test(slugDecoded);
  const { data: bySlug, isPending: slugPending } = useRecipeBySlug(
    isNumericParam ? undefined : slugDecoded,
  );
  const { data: byId, isPending: idPending } = useRecipeQuery(
    isNumericParam ? BigInt(slugDecoded) : undefined,
  );
  const recipe = isNumericParam ? (byId ?? undefined) : bySlug;
  const isPending = isNumericParam ? idPending : slugPending;

  useEffect(() => {
    if (isNumericParam && recipe) {
      void navigate({
        to: "/cookbook/$slug",
        params: { slug: recipe.slug },
        replace: true,
      });
    }
  }, [isNumericParam, recipe, navigate]);

  const relatedIds = recipe?.related_recipe_ids ?? [];
  const relatedQ = useRecipesByIds([...relatedIds]);
  // Same-category fallback when a recipe has no curated related list.
  const sameCategoryQ = useGetRecipes(recipe?.category ?? null, "", 0n, 7n);
  const favoriteMut = useToggleFavorite();

  const { data: seoContent } = useQuery({
    queryKey: ["recipeSeoContent", recipe?.id.toString() ?? ""],
    enabled: !!recipe,
    staleTime: 10 * 60 * 1000,
    queryFn: () =>
      recipe
        ? fetchRecipeSeoContent(recipe.id)
        : Promise.resolve({ intro: null, faqs: [] }),
  });

  const sortedSteps = useMemo(() => {
    const steps = recipe?.steps ? [...recipe.steps] : [];
    steps.sort((a, b) => Number(a.step_number) - Number(b.step_number));
    return steps;
  }, [recipe?.steps]);

  const { data: videoUrl } = useQuery({
    queryKey: ["recipeVideoUrl", recipe?.id.toString() ?? ""],
    enabled: !!recipe,
    staleTime: 10 * 60 * 1000,
    queryFn: () =>
      recipe ? fetchRecipeVideoUrl(recipe.id) : Promise.resolve(null),
  });
  const videoId = videoUrl ? parseYouTubeId(videoUrl) : null;

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
        <h1 className="font-display font-bold text-2xl mb-3">
          Recipe not found
        </h1>
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
  const categoryLabel = recipeCategoryLabel(recipe.category);
  const meta = recipeSeoMeta(recipe);

  const relatedRecipes =
    relatedQ.recipes.length > 0
      ? relatedQ.recipes
      : (sameCategoryQ.data ?? [])
          .filter((r) => r.id !== recipe.id)
          .slice(0, 4);

  const recipeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    keywords: [...recipe.tags, "KNF", "natural farming", "regenerative"].join(
      ", ",
    ),
    recipeCategory: recipeCategoryLabel(recipe.category),
    recipeIngredient: recipe.ingredients.map((ing) =>
      `${ing.amount} ${ing.name}`.trim(),
    ),
    recipeInstructions: sortedSteps.map((s) => ({
      "@type": "HowToStep",
      position: Number(s.step_number),
      text: s.instruction,
    })),
    ...(recipe.prep_time.length > 0 && { prepTime: recipe.prep_time[0] }),
    ...(recipe.total_time.length > 0 && { totalTime: recipe.total_time[0] }),
    author: { "@type": "Organization", name: "IC SPICY" },
    image: "https://www.icspicy.app/banner.png",
    url: `https://www.icspicy.app/cookbook/${encodeURIComponent(recipe.slug)}`,
    ...(videoId && {
      video: {
        "@type": "VideoObject",
        name: `${recipe.title} tutorial`,
        description: recipe.description.slice(0, 200),
        thumbnailUrl: youTubeThumbnailUrl(videoId),
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
      },
    }),
  };

  const faqSchema = faqPageJsonLd(seoContent?.faqs ?? []);
  const jsonLdBlocks = [
    recipeJsonLd,
    recipeBreadcrumbJsonLd(recipe, categoryLabel),
    ...(faqSchema ? [faqSchema] : []),
  ];

  return (
    <>
      <Seo
        title={meta.title}
        description={meta.description}
        path={meta.path}
        ogType="article"
        jsonLd={jsonLdBlocks}
      />
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
          <div className="flex flex-wrap items-center gap-3 mb-3 mt-6">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground -ml-2"
            >
              <Link to="/cookbook" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Cookbook
              </Link>
            </Button>
          </div>

          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground mb-5"
          >
            <Link to="/" className="hover:text-primary transition-smooth">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 opacity-60" aria-hidden />
            <Link
              to="/cookbook"
              className="hover:text-primary transition-smooth"
            >
              CookBook
            </Link>
            <ChevronRight className="w-3 h-3 opacity-60" aria-hidden />
            <span>{categoryLabel}</span>
            <ChevronRight className="w-3 h-3 opacity-60" aria-hidden />
            <span
              className="text-foreground/80 font-medium truncate max-w-[16rem]"
              aria-current="page"
            >
              {recipe.title}
            </span>
          </nav>

          <article className="rounded-3xl border border-border/70 bg-card/55 overflow-hidden">
            <div className="relative aspect-[21/11] md:aspect-[21/9] bg-muted/40 border-b border-border/60">
              {heroKey ? (
                <img
                  src={`/api/object-storage/${heroKey}`}
                  alt={`${recipe.title} — ${categoryLabel} natural farming recipe`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-transparent">
                  <img
                    src="/icon-192.png"
                    alt="IC SPICY logo"
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full opacity-95"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-95" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary text-[10px]"
                  >
                    {recipeCategoryLabel(recipe.category)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  >
                    {difficultyLabel(recipe.difficulty)}
                  </Badge>
                  {recipe.favorite_count > 0n ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-border"
                    >
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
                    <dd className="font-medium">
                      {recipe.fermentation_time[0]}
                    </dd>
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
                    <dd className="font-medium">
                      {recipe.application_rate[0]}
                    </dd>
                  </div>
                ) : null}
                {recipe.application_frequency.length ? (
                  <div className="rounded-xl border border-border/60 bg-background/35 p-3 sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Frequency
                    </dt>
                    <dd className="font-medium">
                      {recipe.application_frequency[0]}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {recipe.best_for.length ? (
                <section>
                  <h2 className="font-display font-bold text-lg mb-2">
                    Best for
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {recipe.best_for.map((b) => (
                      <Badge
                        key={b}
                        variant="secondary"
                        className="border border-border"
                      >
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
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  onClick={() => void handleShare()}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  onClick={printRecipe}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() =>
                    openSpicyAi(`Tell me about the ${recipe.title} recipe.`)
                  }
                  title="Ask SpicyAI about this recipe"
                  data-ocid="cookbook-spicyai-btn"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Ask SpicyAI
                </Button>
              </div>

              {seoContent?.intro ? (
                <section
                  aria-label="About this recipe"
                  className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                >
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                    {seoContent.intro}
                  </p>
                </section>
              ) : null}

              {videoId ? (
                <section aria-label="Video tutorial">
                  <h2 className="font-display font-bold text-xl mb-3 text-primary">
                    Watch the tutorial
                  </h2>
                  <YouTubeEmbed
                    videoId={videoId}
                    title={`${recipe.title} tutorial`}
                  />
                </section>
              ) : null}

              <section className="grid md:grid-cols-5 gap-8">
                <div className="md:col-span-2">
                  <h2 className="font-display font-bold text-xl mb-3 text-primary">
                    Ingredients
                  </h2>
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ing, idx) => (
                      <IngredientLine
                        key={`${recipe.id}-${String(idx)}`}
                        ing={ing}
                      />
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
                      const duration = step.duration.length
                        ? step.duration[0]
                        : "";
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
                              <Badge
                                variant="outline"
                                className="text-[10px] border-border"
                              >
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

              {seoContent && seoContent.faqs.length > 0 ? (
                <section className="pt-4 border-t border-border/55">
                  <h2 className="font-display font-bold text-xl mb-3">
                    Common questions
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {seoContent.faqs.map(([q, a], i) => (
                      <AccordionItem
                        key={`faq-${recipe.id}-${String(i)}`}
                        value={`faq-${String(i)}`}
                        className="border-border/60"
                      >
                        <AccordionTrigger className="text-sm font-semibold text-left hover:text-primary">
                          {q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                          {a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ) : null}

              <section
                aria-label="Growing guides"
                className="rounded-xl border border-border/60 bg-card/50 p-4 flex flex-wrap items-center justify-between gap-3"
                data-ocid="recipe-guides-hint"
              >
                <p className="text-sm text-muted-foreground">
                  <span className="mr-1" aria-hidden>
                    📖
                  </span>
                  Recipes like this power our variety growing guides —
                  stage-by-stage KNF schedules personalized to your zone.
                </p>
                <Link
                  to="/guides"
                  className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
                >
                  Browse growing guides →
                </Link>
              </section>

              {relatedRecipes.length > 0 ? (
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
                      {relatedRecipes.map((r) => (
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
            <h1 className="text-4xl font-black mt-2 text-neutral-950">
              {recipe.title}
            </h1>
            <p className="text-sm mt-2 text-neutral-700">
              {recipeCategoryLabel(recipe.category)} ·{" "}
              {difficultyLabel(recipe.difficulty)}
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
                  <li
                    key={`ps-${recipe.id}-${String(step.step_number ?? idx)}`}
                  >
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
