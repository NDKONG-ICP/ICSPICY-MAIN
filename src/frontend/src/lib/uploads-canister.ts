/** User-upload asset canister — community, avatars, NIMS, shop listing images. */
export function getUploadsCanisterId(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (
    env.VITE_UPLOADS_CANISTER_ID ??
    env.CANISTER_ID_UPLOADS ??
    "r53pg-maaaa-aaaao-ba7na-cai"
  );
}

export const UPLOADS_CANISTER_ID = getUploadsCanisterId();

/** HTTP URL for a stored upload key (e.g. `community-images/.../photo.jpg`). */
export function uploadsUrl(key: string): string {
  const normalized = key.startsWith("/") ? key.slice(1) : key;
  const canisterId = getUploadsCanisterId();
  if (import.meta.env.DEV) {
    return `http://${canisterId}.localhost:4943/${normalized}`;
  }
  return `https://${canisterId}.raw.icp0.io/${normalized}`;
}
