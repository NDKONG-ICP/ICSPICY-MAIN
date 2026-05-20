import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useActorReady } from "../hooks/useActorReady";

const blobUrlCache = new Map<string, string>();

function bytesToBlobUrl(path: string, data: Uint8Array, mimeType: string): string {
  const cached = blobUrlCache.get(path);
  if (cached) return cached;
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(data)], { type: mimeType || "image/jpeg" }),
  );
  blobUrlCache.set(path, url);
  return url;
}

export function ShopListingImage({
  path,
  alt,
  className,
  fallback,
}: {
  path: string | undefined;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const { actor } = useAuth();
  const { actorReady } = useActorReady();

  const { data: src, isLoading } = useQuery({
    queryKey: ["shopListingImage", path, actorReady],
    queryFn: async () => {
      if (!actor || !path) return null;
      const file = await actor.getShopListingFile(path);
      if (!file) return null;
      return bytesToBlobUrl(path, file.data, file.mime_type);
    },
    enabled: !!actor && actorReady && !!path,
    staleTime: 10 * 60 * 1000,
  });

  if (!path) {
    return <>{fallback ?? null}</>;
  }

  if (isLoading) {
    return <Skeleton className={className ?? "w-full h-full"} />;
  }

  if (!src) {
    return <>{fallback ?? null}</>;
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
