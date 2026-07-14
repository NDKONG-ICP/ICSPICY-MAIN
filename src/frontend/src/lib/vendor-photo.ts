import { uploadsUrl } from "./uploads-canister";

/** Resolve a variety photo key to a full uploads-canister URL. */
export function vendorPhotoSrc(photoKey: string): string {
  if (photoKey.startsWith("http://") || photoKey.startsWith("https://")) {
    return photoKey;
  }
  return uploadsUrl(photoKey);
}

/** Thumbnail key convention: variety-photos/{id}-thumb.webp */
export function vendorPhotoThumbSrc(photoKey: string): string | null {
  const m = photoKey.match(/^variety-photos\/(\d+)\.webp$/);
  if (!m) return null;
  return vendorPhotoSrc(`variety-photos/${m[1]}-thumb.webp`);
}

/** Product page URL for photo credit link — first provenance source. */
export function vendorPhotoCreditHref(
  sources: ReadonlyArray<{ url: string }> | undefined,
): string | null {
  const url = sources?.[0]?.url?.trim();
  return url && url.startsWith("http") ? url : null;
}

export const VENDOR_CREDIT_FALLBACK =
  "Photo courtesy of vendor — used with permission";

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
