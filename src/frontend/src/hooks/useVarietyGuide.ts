/**
 * useVarietyGuide — cached-guide query + generation orchestration for the
 * NIMS Variety Growing Guide cards.
 *
 * Flow: query the backend cache → on miss, generate via SpicyAI (with a
 * deterministic KNF fallback) → persist AI results so the next visitor in
 * the same zone gets an instant cache hit.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type GeneratedGuide,
  type GuideConditions,
  type GuideSectionDraft,
  type GuideVarietyInput,
  type RecipeSummary,
  generateVarietyGuide,
} from "../lib/variety-guide-ai";
import {
  type VarietyGuide,
  fetchVarietyGuide,
  persistVarietyGuide,
} from "../lib/variety-guide-idl";

/** Rough USDA zone from latitude — Florida-calibrated, default 10a. */
export function estimateZoneFromLat(lat: number | null | undefined): string {
  if (lat == null || Number.isNaN(lat)) return "10a";
  if (lat >= 30.5) return "8b";
  if (lat >= 29) return "9a";
  if (lat >= 28) return "9b";
  if (lat >= 27) return "10a";
  if (lat >= 26) return "10b";
  return "11a";
}

/** Normalize a server-cached guide to the draft shape the UI renders. */
export function serverGuideToSections(guide: VarietyGuide): GuideSectionDraft[] {
  return guide.sections.map((s) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    content: s.content,
    timing: s.timing.length > 0 ? (s.timing[0] ?? null) : null,
  }));
}

export type GuideState = {
  status: "loading" | "generating" | "ready";
  sections: GuideSectionDraft[];
  recipeRefs: bigint[];
  isFallback: boolean;
  generatedAt: bigint | null;
};

export function useVarietyGuide(
  variety: GuideVarietyInput | null,
  cacheKey: string,
  conditions: GuideConditions,
  recipes: RecipeSummary[],
  recipesReady: boolean,
): GuideState {
  const qc = useQueryClient();
  const [local, setLocal] = useState<GeneratedGuide | null>(null);
  const [generating, setGenerating] = useState(false);
  const inFlightKey = useRef<string | null>(null);

  const varietyId = variety?.varietyId;

  const cached = useQuery({
    queryKey: ["varietyGuide", varietyId?.toString() ?? "", cacheKey],
    queryFn: async () => {
      if (varietyId === undefined) return null;
      return fetchVarietyGuide(varietyId, cacheKey);
    },
    enabled: varietyId !== undefined,
    staleTime: 5 * 60_000,
  });

  // Reset locally-generated guide when the target (variety/personalization)
  // changes so a stale guide never renders under the wrong key.
  const localKey = `${varietyId?.toString() ?? ""}:${cacheKey}`;
  const localKeyRef = useRef(localKey);
  if (localKeyRef.current !== localKey) {
    localKeyRef.current = localKey;
    if (local) setLocal(null);
  }

  const runGeneration = useCallback(async () => {
    if (!variety || inFlightKey.current === localKey) return;
    inFlightKey.current = localKey;
    setGenerating(true);
    try {
      const generated = await generateVarietyGuide(variety, conditions, recipes);
      setLocal(generated);
      // Persist only real AI output — a cached fallback would permanently
      // block better regeneration for everyone in this zone.
      if (!generated.isFallback) {
        const saved = await persistVarietyGuide(
          variety.varietyId,
          cacheKey,
          generated.sections.map((s) => ({
            id: s.id,
            title: s.title,
            icon: s.icon,
            content: s.content,
            timing: s.timing != null ? [s.timing] : [],
          })),
          generated.recipeRefs,
        );
        if (saved) {
          void qc.invalidateQueries({
            queryKey: ["varietyGuide", variety.varietyId.toString(), cacheKey],
          });
        }
      }
    } finally {
      setGenerating(false);
      inFlightKey.current = null;
    }
  }, [variety, conditions, recipes, cacheKey, localKey, qc]);

  useEffect(() => {
    if (
      variety &&
      recipesReady &&
      !cached.isLoading &&
      cached.data == null &&
      !local &&
      !generating
    ) {
      void runGeneration();
    }
  }, [
    variety,
    recipesReady,
    cached.isLoading,
    cached.data,
    local,
    generating,
    runGeneration,
  ]);

  if (cached.data) {
    return {
      status: "ready",
      sections: serverGuideToSections(cached.data),
      recipeRefs: cached.data.recipeRefs,
      isFallback: false,
      generatedAt: cached.data.generatedAt,
    };
  }
  if (local) {
    return {
      status: "ready",
      sections: local.sections,
      recipeRefs: local.recipeRefs,
      isFallback: local.isFallback,
      generatedAt: null,
    };
  }
  return {
    status: cached.isLoading ? "loading" : "generating",
    sections: [],
    recipeRefs: [],
    isFallback: false,
    generatedAt: null,
  };
}
