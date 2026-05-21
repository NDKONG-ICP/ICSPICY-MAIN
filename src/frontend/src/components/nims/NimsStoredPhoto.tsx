import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { isNimsPhotoPath } from "../../lib/nims-photo-upload";
import { useActor } from "../../hooks/useActor";
import { useActorReady } from "../../hooks/useActorReady";
import type { Backend } from "../../backend";

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

export function NimsStoredPhoto({
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
  const { actor } = useActor<Backend>();
  const { actorReady } = useActorReady();

  const { data: src, isLoading } = useQuery({
    queryKey: ["nimsPhoto", path, actorReady],
    queryFn: async () => {
      if (!actor || !path || !isNimsPhotoPath(path)) return null;
      const file = await actor.getNimsPhotoFile(path);
      if (!file) return null;
      return bytesToBlobUrl(path, file.data, file.mime_type);
    },
    enabled: !!actor && actorReady && !!path && isNimsPhotoPath(path),
    staleTime: 10 * 60 * 1000,
  });

  if (!path || !isNimsPhotoPath(path)) {
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
