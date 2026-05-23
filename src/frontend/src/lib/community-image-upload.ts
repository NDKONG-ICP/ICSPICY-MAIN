import type { ActorSubclass } from "@dfinity/agent";
import type { Backend } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
import { compressImage } from "../utils/imageUtils";

/** 1 MiB cap after compression (Phase 7 community carousel). */
const MAX_COMPRESSED_BYTES = 1_048_576;

const MAX_FILES = 4;

export const MAX_COMMUNITY_IMAGE_FILES = MAX_FILES;

/** Match keys returned by `buildCommunityImagePath` / uploads. */
export function isCommunityPhotoPath(path: string): boolean {
  return path.startsWith("community-images/");
}

export function getCommunityPhotoQueryKeyPart(
  path: string | undefined,
): string {
  return path ?? "";
}

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

/**
 * Canonical object path for Phase 7 community uploads.
 * Stored under the caller principal so blobs stay namespaced server-side audits.
 */
export function buildCommunityImagePath(principalText: string): string {
  const id =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}`;
  return `community-images/${principalText}/${Date.now()}-${id}.jpg`;
}

/**
 * Compress, enforce size/count limits, upload via raw `_SERVICE.storeCommunityImage`.
 *
 * Returns `StoredFile.path` values suitable for `CreatePostInput.image_keys`.
 */
export async function uploadCommunityImages(
  actor: Backend | null,
  principalText: string,
  files: File[],
): Promise<string[]> {
  if (!principalText.trim()) throw new Error("principalText required");
  if (files.length > MAX_FILES) {
    throw new Error(`Community images are limited to ${MAX_FILES} files.`);
  }
  const svc = rawService(actor);
  if (!svc) throw new Error("Backend actor not connected");

  const paths: string[] = [];
  for (const file of files) {
    const blob = await compressImage(file);
    if (blob.size > MAX_COMPRESSED_BYTES) {
      throw new Error(
        `Image exceeds ${MAX_COMPRESSED_BYTES} bytes after compression.`,
      );
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const path = buildCommunityImagePath(principalText);
    const mime = blob.type || "image/jpeg";
    const stored = await svc.storeCommunityImage(path, bytes, mime);
    paths.push(stored.path);
  }
  return paths;
}
