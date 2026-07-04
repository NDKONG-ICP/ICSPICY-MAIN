/**
 * /variety/$varietyId/guide — AI-generated, location-personalized
 * regenerative growing guide for a NIMS variety.
 */
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { VarietyGuideCard } from "../components/nims/VarietyGuideCard";
import { recipeCategoryLabel, useGetRecipes } from "../hooks/useCookbook";
import { useVarieties } from "../hooks/useNims";
import { useNimsLocation } from "../hooks/useNimsLocation";
import { Seo } from "../components/Seo";
import { useRavenPerks } from "../hooks/useRavenPerks";
import { estimateZoneFromLat, useVarietyGuide } from "../hooks/useVarietyGuide";
import {
  type GuideConditions,
  type GuideVarietyInput,
  type RecipeSummary,
  guideCacheKey,
  loadGuideConditions,
  saveGuideConditions,
} from "../lib/variety-guide-ai";

const PERSONALIZED_FLAG_KEY = "nims-guide-personalized";

export default function VarietyGuidePage() {
  const { varietyId: varietyIdParam } = useParams({ strict: false }) as {
    varietyId?: string;
  };
  const varietyId = useMemo(() => {
    try {
      return varietyIdParam != null ? BigInt(varietyIdParam) : null;
    } catch {
      return null;
    }
  }, [varietyIdParam]);

  const { data: varieties = [], isLoading: varietiesLoading } = useVarieties();
  const variety = varieties.find((v) => v.id === varietyId) ?? null;

  const { coordinates } = useNimsLocation();
  const autoZone = estimateZoneFromLat(coordinates?.lat);
  const ravenPerks = useRavenPerks();
  const canPersonalize = ravenPerks.tier !== "free";

  const [conditions, setConditions] = useState<GuideConditions>(() => {
    const stored = loadGuideConditions();
    // Auto-zone from GPS unless the user explicitly saved a zone before.
    const hasStored =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("nims-guide-conditions") != null;
    return hasStored ? stored : { ...stored, zone: autoZone };
  });
  const [personalized, setPersonalized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PERSONALIZED_FLAG_KEY) === "1";
    } catch {
      return false;
    }
  });

  const cacheKey = guideCacheKey(conditions, personalized && canPersonalize);

  // Published recipes injected into the AI prompt + used to render chips.
  const { data: recipePage = [], isLoading: recipesLoading } = useGetRecipes(
    null,
    "",
    0n,
    100n,
  );
  const recipeSummaries: RecipeSummary[] = useMemo(
    () =>
      recipePage.map((r) => ({
        id: r.id,
        title: r.title,
        category: recipeCategoryLabel(r.category),
      })),
    [recipePage],
  );

  const guideVariety: GuideVarietyInput | null = useMemo(() => {
    if (!variety) return null;
    return {
      varietyId: variety.id,
      name: variety.name,
      species: variety.species,
      scovilleMax: Number(variety.scovilleMax),
      daysToMaturity:
        variety.daysToMaturity.length > 0
          ? Number(variety.daysToMaturity[0])
          : null,
      description: variety.description,
    };
  }, [variety]);

  const guide = useVarietyGuide(
    guideVariety,
    cacheKey,
    conditions,
    recipeSummaries,
    !recipesLoading,
  );

  const guideRecipes = useMemo(() => {
    const refSet = new Set(guide.recipeRefs.map((r) => r.toString()));
    return recipePage.filter((r) => refSet.has(r.id.toString()));
  }, [recipePage, guide.recipeRefs]);

  const applyConditions = (c: GuideConditions) => {
    saveGuideConditions(c);
    setConditions(c);
    setPersonalized(true);
    try {
      localStorage.setItem(PERSONALIZED_FLAG_KEY, "1");
    } catch {
      /* non-fatal */
    }
  };

  if (varietiesLoading) {
    return (
      <div className="container max-w-3xl px-4 py-8">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!variety || varietyId == null) {
    return (
      <div className="container max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-semibold">Variety not found.</p>
        <Link to="/nims" className="mt-2 inline-block text-primary underline">
          Back to NIMS
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl px-4 py-6">
      <Seo
        title={`How to Grow ${variety.name} — Regenerative KNF Guide | IC SPICY`}
        description={`Free location-personalized growing guide for ${variety.name} (${variety.species}): soil prep, planting windows, stage-by-stage KNF nutrition, natural pest control, and harvest — Korean Natural Farming style.`}
        path={`/variety/${variety.id.toString()}/guide`}
        ogType="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `How to Grow ${variety.name} — Regenerative Growing Guide`,
          author: { "@type": "Organization", name: "IC SPICY" },
          publisher: { "@type": "Organization", name: "IC SPICY" },
          about: variety.species,
          url: `https://www.icspicy.app/variety/${variety.id.toString()}/guide`,
        }}
      />
      <Link
        to="/nims"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary print:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to NIMS
      </Link>
      <VarietyGuideCard
        variety={variety}
        zone={conditions.zone}
        status={guide.status}
        sections={guide.sections}
        recipes={guideRecipes}
        isFallback={guide.isFallback}
        conditions={conditions}
        personalized={personalized && canPersonalize}
        canPersonalize={canPersonalize}
        onApplyConditions={applyConditions}
      />
    </div>
  );
}
