import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  ChefHat,
  Copy,
  FlaskConical,
  Heart,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { RecipePublic } from "../declarations/backend.did";
import { useAuth } from "../hooks/useAuth";
import { useActorReady } from "../hooks/useActorReady";
import {
  COOKBOOK_PAGE_SIZE,
  difficultyLabel,
  recipeCategoryLabel,
  useFeaturedRecipes,
  useRecipeCategories,
  useRecipesInfinite,
  useToggleFavorite,
  type CategoryFilter,
} from "../hooks/useCookbook";

function difficultyBadgeClass(diff: RecipePublic["difficulty"]): string {
  if ("Beginner" in diff) {
    return "border-emerald-500/35 text-emerald-400 bg-emerald-500/10";
  }
  if ("Intermediate" in diff) {
    return "border-amber-500/35 text-amber-400 bg-amber-500/10";
  }
  return "border-red-500/35 text-red-400 bg-red-500/10";
}

function RecipeGridSkeleton({ count }: { count: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      aria-busy="true"
      aria-label="Loading recipes"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`sk-${String(i)}`}
          className="rounded-2xl border border-border bg-card/60 p-4 space-y-4"
        >
          <Skeleton className="w-full aspect-[16/11] rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function CookBookPage() {
  const { actorReady } = useActorReady();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: categoryRows } = useRecipeCategories();
  const featured = useFeaturedRecipes(12n);

  const recipesQ = useRecipesInfinite(selectedCategory, debouncedSearch);
  const flatRecipes = useMemo(
    () => recipesQ.data?.pages.flat() ?? [],
    [recipesQ.data?.pages],
  );

  const favoriteMut = useToggleFavorite();

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const loadMore = useCallback(() => {
    if (
      recipesQ.hasNextPage &&
      !recipesQ.isFetchingNextPage &&
      !recipesQ.isFetching
    ) {
      void recipesQ.fetchNextPage();
    }
  }, [recipesQ]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !actorReady) return;
    const root = document.querySelector("main") ?? null;
    const io = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e?.isIntersecting) loadMore();
      },
      { root, rootMargin: "400px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, actorReady, flatRecipes.length, selectedCategory, debouncedSearch]);

  async function toggleFavorite(ev: React.MouseEvent, recipe: RecipePublic) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!isAuthenticated) {
      toast.message("Sign in to save cookbook favorites.", {
        description: "Use Internet Identity, then tap the heart again.",
      });
      return;
    }
    try {
      await favoriteMut.mutateAsync(recipe.id);
    } catch {
      toast.error("Could not update favorite.");
    }
  }

  async function copyShareSlug(slug: string) {
    const url = `${window.location.origin}/cookbook/${encodeURIComponent(slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Recipe link copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      <motion.section
        className="relative rounded-2xl overflow-hidden mb-10 mt-4 border border-border/60 bg-card/40"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <img
          src="/assets/generated/cookbook-hero.dim_1200x480.jpg"
          alt="IC SPICY Natural Farming CookBook"
          className="w-full h-52 sm:h-64 object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 py-8">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Natural Farming CookBook
            </span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl text-foreground leading-none mb-2">
            IC SPICY <span className="text-fire">CookBook</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
            On-chain fermentation and soil-health recipes — structured for the
            greenhouse, written for reproducible batches.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge
              variant="outline"
              className="text-xs border-primary/30 text-primary"
            >
              Phase 8 model
            </Badge>
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              Pagination {COOKBOOK_PAGE_SIZE.toString()}/page
            </Badge>
          </div>
        </div>
      </motion.section>

      {featured.data && featured.data.length > 0 && (
        <section className="mb-11" aria-label="Featured">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h2 className="font-display font-bold text-lg text-foreground">
              Featured picks
            </h2>
            <div className="flex-1 h-px bg-border/45" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.map((recipe) => (
              <FeaturedCard
                key={recipe.id.toString()}
                recipe={recipe}
                onFavorite={toggleFavorite}
                favPending={favoriteMut.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <motion.div
        className="space-y-4 mb-10"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, ingredients, tags… (/ to focus)"
            className="pl-10 pr-11 bg-card border-border"
            aria-label="Search cookbook"
            data-ocid="cookbook-search-input"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mr-1">
            Category
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-smooth font-medium ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/25 text-muted-foreground border-border hover:border-primary/40"
            }`}
            data-ocid="cookbook-category-all"
          >
            All
          </button>
          {(categoryRows ?? []).map(([cat]) => {
            const pressed =
              selectedCategory !== null &&
              JSON.stringify(selectedCategory) === JSON.stringify(cat);
            return (
              <button
                key={recipeCategoryLabel(cat)}
                type="button"
                onClick={() =>
                  setSelectedCategory((prev) => {
                    if (
                      prev !== null &&
                      JSON.stringify(prev) === JSON.stringify(cat)
                    ) {
                      return null;
                    }
                    return cat;
                  })
                }
                className={`text-xs px-3 py-1.5 rounded-full border transition-smooth font-medium ${
                  pressed
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/25 text-muted-foreground border-border hover:border-primary/40"
                }`}
                data-ocid={`cookbook-category-${recipeCategoryLabel(cat).replace(/\s+/g, "-").toLowerCase()}`}
              >
                {recipeCategoryLabel(cat)}
              </button>
            );
          })}
        </div>
      </motion.div>

      <section aria-label="Recipes">
        <div className="flex items-center gap-2 mb-5">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display font-bold text-lg">
            Recipes
          </h2>
          <span className="text-xs text-muted-foreground">
            {flatRecipes.length} loaded
          </span>
          <div className="flex-1 h-px bg-border/45 ml-2" />
        </div>

        {!actorReady ? (
          <RecipeGridSkeleton count={6} />
        ) : recipesQ.isPending && flatRecipes.length === 0 ? (
          <RecipeGridSkeleton count={6} />
        ) : flatRecipes.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl border border-dashed border-border/70 bg-muted/15"
            data-ocid="cookbook-empty-state"
          >
            <ChefHat className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-35" />
            <p className="text-foreground font-medium mb-2">No recipes match</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {(search.trim() !== "" ? "Try clearing search." : "").trim()}
              {search.trim() === ""
                ? "Nothing is published yet, or seeds have not loaded."
                : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {flatRecipes.map((recipe, index) => (
                <motion.article
                  key={recipe.id.toString()}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                  className="group relative rounded-2xl border border-border/70 bg-card/55 hover:border-primary/35 hover:bg-card/80 transition-colors overflow-hidden"
                >
                  <Link
                    to="/cookbook/$slug"
                    params={{ slug: recipe.slug }}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-2xl"
                    data-ocid={`cookbook-card-${recipe.slug}`}
                  >
                    <div className="relative aspect-[16/11] bg-muted/30 border-b border-border/50">
                      {recipe.image_key.length > 0 && recipe.image_key[0] ? (
                        <img
                          src={`/api/object-storage/${recipe.image_key[0] ?? ""}`}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-background">
                          <span className="font-display font-black text-4xl text-primary/60">
                            {recipe.title.slice(0, 1)}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background via-background/80 to-transparent pt-14">
                        <h3 className="font-display font-bold text-lg text-foreground leading-tight line-clamp-2">
                          {recipe.title}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${difficultyBadgeClass(recipe.difficulty)}`}
                          >
                            {difficultyLabel(recipe.difficulty)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-border/60 text-muted-foreground bg-background/70"
                          >
                            {recipeCategoryLabel(recipe.category)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {recipe.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recipe.tags.slice(0, 4).map((t) => (
                          <span
                            key={`${recipe.id}-${t}`}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <button
                      type="button"
                      aria-label={
                        recipe.caller_favorited ? "Remove favorite" : "Add favorite"
                      }
                      disabled={favoriteMut.isPending}
                      onClick={(e) => void toggleFavorite(e, recipe)}
                      className={`rounded-full p-2 border backdrop-blur-sm transition-colors ${
                        recipe.caller_favorited
                          ? "bg-primary/90 border-primary text-primary-foreground"
                          : "bg-black/55 border-white/15 text-white hover:bg-black/65"
                      }`}
                      data-ocid={`cookbook-fav-${recipe.slug}`}
                    >
                      <Heart
                        className={`w-4 h-4 ${recipe.caller_favorited ? "fill-current" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Copy share link"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void copyShareSlug(recipe.slug);
                      }}
                      className="rounded-full p-2 border border-white/15 bg-black/55 text-white hover:bg-black/65 backdrop-blur-sm"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>

            <div ref={sentinelRef} className="h-10 w-full" aria-hidden />

            {recipesQ.isFetchingNextPage ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                Loading more…
              </p>
            ) : null}
            {!recipesQ.hasNextPage && flatRecipes.length > 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                End of catalog
              </p>
            ) : null}
          </>
        )}
      </section>

      <motion.div
        className="mt-16 rounded-2xl border border-border bg-card/50 p-8 text-center"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <FlaskConical className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-display font-bold text-xl mb-2">Need inputs?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
          Garden amendments and nursery stock ship from the IC SPICY marketplace.
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <a href="/marketplace?category=GardenInputs" data-ocid="cookbook-shop-cta">
            Shop supplies
          </a>
        </Button>
      </motion.div>
    </div>
  );
}

function FeaturedCard({
  recipe,
  onFavorite,
  favPending,
}: {
  recipe: RecipePublic;
  onFavorite: (e: React.MouseEvent, r: RecipePublic) => void;
  favPending: boolean;
}) {
  return (
    <div className="relative rounded-xl border border-border/70 bg-card/50 overflow-hidden">
      <Link
        to="/cookbook/$slug"
        params={{ slug: recipe.slug }}
        className="block p-4 pr-14 hover:bg-muted/15 transition-colors"
      >
        <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">
          Featured
        </p>
        <h3 className="font-display font-bold text-base text-foreground leading-snug line-clamp-2">
          {recipe.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {recipe.description}
        </p>
        <div className="flex gap-2 mt-3">
          <Badge
            variant="outline"
            className={`text-[10px] ${difficultyBadgeClass(recipe.difficulty)}`}
          >
            {difficultyLabel(recipe.difficulty)}
          </Badge>
        </div>
      </Link>
      <button
        type="button"
        disabled={favPending}
        onClick={(e) => onFavorite(e, recipe)}
        className={`absolute top-3 right-3 rounded-full p-2 border ${
          recipe.caller_favorited
            ? "bg-primary/90 border-primary text-primary-foreground"
            : "bg-background/80 border-border text-foreground"
        }`}
        aria-label="Toggle favorite"
      >
        <Heart className={`w-4 h-4 ${recipe.caller_favorited ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}
