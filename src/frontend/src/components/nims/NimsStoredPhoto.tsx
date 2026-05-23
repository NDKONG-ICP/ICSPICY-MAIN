import type { ReactNode } from "react";
import { isNimsPhotoPath } from "../../lib/nims-photo-upload";
import { uploadsUrl } from "../../lib/uploads-canister";

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
  if (!path || !isNimsPhotoPath(path)) {
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
