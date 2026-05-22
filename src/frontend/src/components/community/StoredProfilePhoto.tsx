import { Skeleton } from "@/components/ui/skeleton";
import type { ActorSubclass } from "@dfinity/agent";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Backend } from "../../backend";
import { createActor } from "../../backend";
import type { _SERVICE } from "../../declarations/backend.did";
import { useActor } from "../../hooks/useActor";
import { useActorReady } from "../../hooks/useActorReady";
import { isAvatarPath } from "../../lib/avatar-upload";
import {
  getCommunityPhotoQueryKeyPart,
  isCommunityPhotoPath,
} from "../../lib/community-image-upload";

const blobUrlCache = new Map<string, string>();

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

function bytesToBlobUrl(
  path: string,
  data: Uint8Array,
  mimeType: string,
): string {
  const cached = blobUrlCache.get(path);
  if (cached) return cached;
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(data)], { type: mimeType || "image/jpeg" }),
  );
  blobUrlCache.set(path, url);
  return url;
}

export function StoredProfilePhoto({
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
  const { actor } = useActor<Backend>(createActor);
  const { actorReady } = useActorReady();
  const svc = rawService(actor);

  const { data: src, isLoading } = useQuery({
    queryKey: ["storedProfilePhoto", getCommunityPhotoQueryKeyPart(path)],
    queryFn: async () => {
      if (!svc || !path) return null;
      if (isAvatarPath(path)) {
        const data = await svc.getAvatarFile(path);
        if (!data || data.length === 0) return null;
        const bytes = data[0]!;
        const arr =
          bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        return bytesToBlobUrl(path, arr, "image/jpeg");
      }
      if (isCommunityPhotoPath(path)) {
        const res = await svc.getCommunityImageFile(path);
        if (res.length === 0) return null;
        const file = res[0]!;
        const blobData =
          file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
        return bytesToBlobUrl(path, blobData, file.mime_type);
      }
      return null;
    },
    enabled:
      svc !== null &&
      actorReady &&
      !!path &&
      (isAvatarPath(path) || isCommunityPhotoPath(path)),
    staleTime: 10 * 60 * 1000,
  });

  if (!path || (!isAvatarPath(path) && !isCommunityPhotoPath(path))) {
    return <>{fallback ?? null}</>;
  }

  if (isLoading) {
    return <Skeleton className={className ?? "w-full h-full rounded-full"} />;
  }

  if (!src) {
    return <>{fallback ?? null}</>;
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
