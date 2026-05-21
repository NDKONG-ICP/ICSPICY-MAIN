import type { ActorSubclass } from "@dfinity/agent";
import type { Backend } from "../backend";
import type {
  RecipeCategory,
  RecipeId,
  RecipePublic,
  _SERVICE,
} from "../declarations/backend.did";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import { useBackendActor, useIsAdmin } from "./useBackend";
import { useActorReady } from "./useActorReady";
import { useAuth } from "./useAuth";

export const COOKBOOK_PAGE_SIZE = 12n;

export type { RecipePublic, RecipeCategory } from "../declarations/backend.did";

/** Raw `@dfinity` actor behind the `Backend` envelope (correct Candid decoding). */
function cookbookService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

/** Optional Candid wrapper: omit field vs empty array differs per agent; backend treats null as no filter. */
export type CategoryFilter = RecipeCategory | null;

export function categoryToOpt(cat: CategoryFilter): [] | [RecipeCategory] {
  return cat === null ? [] : [cat];
}

export function recipeCategoryLabel(cat: RecipeCategory): string {
  if ("KNF" in cat) return "KNF";
  if ("JADAM" in cat) return "JADAM";
  if ("Composting" in cat) return "Composting";
  if ("PestControl" in cat) return "Pest Control";
  if ("SoilAmendment" in cat) return "Soil Amendment";
  if ("FermentedInputs" in cat) return "Fermented Inputs";
  if ("MicrobialCultures" in cat) return "Microbial Cultures";
  if ("PlantExtracts" in cat) return "Plant Extracts";
  return "Other";
}

export function difficultyLabel(diff: RecipePublic["difficulty"]): string {
  if ("Beginner" in diff) return "Beginner";
  if ("Intermediate" in diff) return "Intermediate";
  return "Advanced";
}

/** Debounced cookbook search mirrors `RecipesLib.optTextContains` (empty ⇒ no filter). */
export function searchToOpt(trimmed: string): [] | [string] {
  return trimmed.length === 0 ? [] : [trimmed];
}

// ─── Public cookbook queries ───────────────────────────────────────────────────

export function useRecipeCategories() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  return useQuery({
    queryKey: ["cookbook", "categories"],
    queryFn: async (): Promise<Array<[RecipeCategory, bigint]>> => {
      if (!svc) return [];
      return svc.getRecipeCategories();
    },
    enabled: !!svc && actorReady,
    staleTime: 120_000,
  });
}

export function useFeaturedRecipes(limit: bigint) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  return useQuery({
    queryKey: ["cookbook", "featured", limit.toString()],
    queryFn: async (): Promise<RecipePublic[]> => {
      if (!svc) return [];
      return svc.getFeaturedRecipes(limit);
    },
    enabled: !!svc && actorReady && limit > 0n,
  });
}

export function useRecipesInfinite(category: CategoryFilter, search: string) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  const trimmed = search.trim();

  return useInfiniteQuery({
    queryKey: [
      "cookbook",
      "getRecipes",
      category === null ? "all" : recipeCategoryLabel(category),
      trimmed,
    ],
    initialPageParam: 0n,
    queryFn: async ({ pageParam }): Promise<RecipePublic[]> => {
      if (!svc) throw new Error("Backend not connected");
      return svc.getRecipes(
        categoryToOpt(category),
        searchToOpt(trimmed),
        pageParam as bigint,
        COOKBOOK_PAGE_SIZE,
      );
    },
    getNextPageParam: (lastPage, _all, lastOffset) => {
      if (!lastPage || lastPage.length < Number(COOKBOOK_PAGE_SIZE)) {
        return undefined;
      }
      return ((lastOffset as bigint) ?? 0n) + COOKBOOK_PAGE_SIZE;
    },
    enabled: !!svc && actorReady,
    staleTime: 30_000,
  });
}

export function useRecipeBySlug(slug: string | undefined) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  const s = slug?.trim() ?? "";
  return useQuery({
    queryKey: ["cookbook", "slug", s],
    queryFn: async (): Promise<RecipePublic | null> => {
      if (!svc || !s) return null;
      const opt = await svc.getRecipeBySlug(s);
      return opt.length === 0 ? null : opt[0] ?? null;
    },
    enabled: !!svc && actorReady && s.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useRecipesByIds(ids: RecipeId[]) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  const uniq = [...new Set(ids.map((id) => id.toString()))];

  return useQueries({
    queries: uniq.map((idStr) => ({
      queryKey: ["recipe", idStr],
      queryFn: async (): Promise<RecipePublic | null> => {
        if (!svc) return null;
        const id = BigInt(idStr);
        const opt = await svc.getRecipe(id);
        return opt.length === 0 ? null : opt[0] ?? null;
      },
      enabled: !!svc && actorReady && uniq.length > 0,
      staleTime: 60_000,
    })),
    combine: (results) => {
      return {
        recipes: results
          .map((r) => r.data)
          .filter((x): x is RecipePublic => x != null),
        isLoading: results.some((r) => r.isPending),
      };
    },
  });
}

export function useSearchRecipes(q: string, limit: bigint) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  const trimmed = q.trim();

  return useQuery({
    queryKey: ["cookbook", "searchPreview", trimmed, limit.toString()],
    queryFn: async (): Promise<RecipePublic[]> => {
      if (!svc) return [];
      if (trimmed.length === 0) return [];
      return svc.searchRecipes(trimmed, limit);
    },
    enabled: !!svc && actorReady && trimmed.length >= 2,
    staleTime: 15_000,
  });
}

// ─── Favorites (authenticated update methods) ───────────────────────────────

export function useMyFavorites(offset: bigint, limit: bigint) {
  const { principal, isAuthenticated } = useAuth();
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  const pid = principal?.toText() ?? "";

  return useQuery({
    queryKey: ["cookbook", "myFavorites", pid, offset.toString(), limit.toString()],
    queryFn: async (): Promise<RecipePublic[]> => {
      if (!svc) return [];
      return svc.getMyFavorites(offset, limit);
    },
    enabled: !!svc && actorReady && isAuthenticated && limit > 0n,
    staleTime: 20_000,
  });
}

export function useToggleFavorite() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipeId: RecipeId) => {
      const svc = cookbookService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.toggleFavorite(recipeId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["cookbook"] });
      await qc.invalidateQueries({ queryKey: ["recipe"] });
    },
  });
}

// ─── Thin aliases for tooling that prefers explicit actor names ───────────────

export function useGetRecipes(
  category: CategoryFilter,
  search: string,
  offset: bigint,
  limit: bigint,
) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  const trimmed = search.trim();

  return useQuery({
    queryKey: [
      "cookbook",
      "getRecipesPage",
      category === null ? "all" : recipeCategoryLabel(category),
      trimmed,
      offset.toString(),
      limit.toString(),
    ],
    queryFn: async (): Promise<RecipePublic[]> => {
      if (!svc) throw new Error("Backend not connected");
      return svc.getRecipes(
        categoryToOpt(category),
        searchToOpt(trimmed),
        offset,
        limit,
      );
    },
    enabled: !!svc && actorReady,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useRecipeQuery(id: RecipeId | undefined) {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const svc = cookbookService(actor);
  return useQuery({
    queryKey: ["recipe", id?.toString() ?? "_"],
    queryFn: async (): Promise<RecipePublic | null> => {
      if (!svc || id === undefined) return null;
      const opt = await svc.getRecipe(id);
      return opt.length === 0 ? null : opt[0] ?? null;
    },
    enabled: !!svc && actorReady && id !== undefined,
    staleTime: 45_000,
  });
}

// ─── Admin cookbook (authenticated admin callers only) ────────────────────────

export function useListRecipesAdmin() {
  const { actor } = useBackendActor();
  const { actorReady } = useActorReady();
  const { data: isAdmin } = useIsAdmin();
  const svc = cookbookService(actor);
  return useQuery({
    queryKey: ["cookbook", "adminList", actorReady, Boolean(isAdmin)],
    queryFn: async (): Promise<RecipePublic[]> => {
      if (!svc) return [];
      return svc.listRecipesAdmin();
    },
    enabled: !!svc && actorReady && isAdmin === true,
    staleTime: 15_000,
  });
}

export function usePublishRecipe() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: RecipeId) => {
      const svc = cookbookService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.publishRecipe(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["cookbook"] });
    },
  });
}

export function useDeleteRecipeAdmin() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: RecipeId) => {
      const svc = cookbookService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.deleteRecipe(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["cookbook"] });
    },
  });
}
