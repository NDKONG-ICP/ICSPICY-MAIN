import type { ActorSubclass } from "@dfinity/agent";
import type { Backend } from "../backend";
import type { _SERVICE } from "../declarations/backend.did";
import { compressAvatarImage } from "../utils/imageUtils";

const MAX_AVATAR_BYTES = 512_000;

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
}

export function isAvatarPath(path: string): boolean {
  return path.startsWith("avatars/") || path.startsWith("community-images/");
}

/** Deterministic HSL background from principal text. */
export function principalAvatarColor(principalText: string): string {
  let hash = 0;
  for (let i = 0; i < principalText.length; i++) {
    hash = (hash * 31 + principalText.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 55% 42%)`;
}

export function principalInitials(
  username: string | undefined,
  principalText: string,
): string {
  const u = username?.trim();
  if (u && u.length >= 2) return u.slice(0, 2).toUpperCase();
  if (u && u.length === 1) return u.toUpperCase();
  return principalText.slice(0, 2).toUpperCase();
}

export async function uploadAvatar(
  actor: Backend | null,
  file: File,
): Promise<string> {
  const svc = rawService(actor);
  if (!svc) throw new Error("Backend actor not connected");
  const blob = await compressAvatarImage(file);
  if (blob.size > MAX_AVATAR_BYTES) {
    throw new Error("Avatar exceeds 500 KB after compression.");
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return svc.storeAvatarFile(bytes);
}
