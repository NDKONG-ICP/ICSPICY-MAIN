import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../../backend";
import { requireBackendRaw } from "../../lib/backend-raw";
import { useActor } from "../../hooks/useActor";
import { useAuth } from "../../hooks/useAuth";

export interface SavedCrafterRecipe {
  name: string;
  ingredients: { name: string; amount: bigint }[];
  shu: bigint;
  harmony: bigint;
  created: bigint;
}

export function useMyCrafterRecipes() {
  const { actor } = useActor<Backend>();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["games", "crafter", "myRecipes"],
    queryFn: async (): Promise<SavedCrafterRecipe[]> => {
      const raw = requireBackendRaw(actor);
      const rows = await raw.getMyCrafterRecipes();
      return rows.map((r) => ({
        name: r.name,
        ingredients: r.ingredients.map((i) => ({
          name: i.name,
          amount: i.amount,
        })),
        shu: r.shu,
        harmony: r.harmony,
        created: r.created,
      }));
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 15_000,
  });
}

export function useSaveCrafterRecipe() {
  const { actor } = useActor<Backend>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      ingredients: [string, bigint][];
      shu: bigint;
      harmony: bigint;
    }) => {
      const raw = requireBackendRaw(actor);
      const result = await raw.saveCrafterRecipe(
        args.name,
        args.ingredients,
        args.shu,
        args.harmony,
      );
      const r = result as { ok?: null; err?: string };
      if (r.err) throw new Error(r.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["games", "crafter", "myRecipes"] });
    },
  });
}

// Future: recipe sharing / community voting hook
// export function useShareCrafterRecipe() { /* NFT + social stub */ }

// Future: Recipe NFT mint on S-grade legendary batches
// export function useMintRecipeNft() { /* claimGameAchievement + ICRC-7 stub */ }
