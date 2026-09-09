import type { ActorSubclass } from "@dfinity/agent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backend } from "../backend";
import { createActor } from "../backend";
import type {
  VerifiedGrower,
  VerifiedGrowerUpsert,
  _SERVICE,
} from "../declarations/backend.did";
import { uploadVerifiedGrowerImage } from "../lib/verified-grower-image-upload";
import { uploadsUrl } from "../lib/uploads-canister";
import { useActor } from "./useActor";
import { useActorReady } from "./useActorReady";

export type { VerifiedGrower, VerifiedGrowerUpsert };

export type VerifiedGrowerView = {
  id: string;
  name: string;
  owners: string;
  tagline: string;
  description: string;
  story: string;
  url: string;
  categories: string[];
  stats: { label: string; value: string }[];
  imageKey: string;
  imageUrl: string;
  growerOfTheMonth?: string;
  establishedYear?: number;
  sortOrder: number;
};

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function useVerifiedGrowersActor() {
  return useActor<Backend>(createActor);
}

function mapGrower(g: VerifiedGrower): VerifiedGrowerView {
  const imageKey = g.imageKey;
  return {
    id: g.id,
    name: g.name,
    owners: g.owners,
    tagline: g.tagline,
    description: g.description,
    story: g.story,
    url: g.url,
    categories: [...g.categories],
    stats: g.stats.map((s) => ({
      label: s.statLabel,
      value: s.value,
    })),
    imageKey,
    imageUrl: imageKey ? uploadsUrl(imageKey) : "",
    growerOfTheMonth:
      g.growerOfTheMonth.length === 1 ? g.growerOfTheMonth[0] : undefined,
    establishedYear:
      g.establishedYear.length === 1 ? Number(g.establishedYear[0]) : undefined,
    sortOrder: Number(g.sortOrder),
  };
}

export function useVerifiedGrowers() {
  const { actor } = useVerifiedGrowersActor();
  const { actorReady } = useActorReady();
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["verifiedGrowers"],
    queryFn: async (): Promise<VerifiedGrowerView[]> => {
      if (!svc) throw new Error("Backend actor not connected");
      const rows = await svc.listVerifiedGrowers();
      return rows.map(mapGrower);
    },
    enabled: !!svc && actorReady,
    staleTime: 60_000,
  });
}

export function getGrowerOfTheMonth(
  growers: VerifiedGrowerView[] | undefined,
): VerifiedGrowerView | undefined {
  return growers?.find((g) => g.growerOfTheMonth);
}

export function getVerifiedGrowersExceptFeatured(
  growers: VerifiedGrowerView[] | undefined,
): VerifiedGrowerView[] {
  if (!growers?.length) return [];
  const featured = getGrowerOfTheMonth(growers);
  if (!featured) return growers;
  return growers.filter((g) => g.id !== featured.id);
}

export function useAdminUpsertVerifiedGrower() {
  const { actor } = useVerifiedGrowersActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VerifiedGrowerUpsert) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.adminUpsertVerifiedGrower(input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["verifiedGrowers"] });
    },
  });
}

export function useAdminDeleteVerifiedGrower() {
  const { actor } = useVerifiedGrowersActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.adminDeleteVerifiedGrower(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["verifiedGrowers"] });
    },
  });
}

export function useAdminSetGrowerOfTheMonth() {
  const { actor } = useVerifiedGrowersActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      monthLabel,
    }: {
      id: string;
      monthLabel: string;
    }) => {
      const svc = rawService(actor);
      if (!svc) throw new Error("Not connected");
      return svc.adminSetGrowerOfTheMonth(id, monthLabel);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["verifiedGrowers"] });
    },
  });
}

export function useUploadVerifiedGrowerImage() {
  const { actor } = useVerifiedGrowersActor();
  return useMutation({
    mutationFn: async ({ slug, file }: { slug: string; file: File }) => {
      if (!actor) throw new Error("Not connected");
      return uploadVerifiedGrowerImage(actor, slug, file);
    },
  });
}

export function slugifyGrowerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
