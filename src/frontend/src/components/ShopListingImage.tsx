import type { ReactNode } from "react";
import { uploadsUrl } from "../lib/uploads-canister";

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
  if (!path) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      src={uploadsUrl(path)}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
