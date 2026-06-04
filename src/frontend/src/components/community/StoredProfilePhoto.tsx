import type { ReactNode } from "react";
import { isAvatarPath } from "../../lib/avatar-upload";
import { isCommunityPhotoPath } from "../../lib/community-image-upload";
import { uploadsUrl } from "../../lib/uploads-canister";

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
  if (!path || (!isAvatarPath(path) && !isCommunityPhotoPath(path))) {
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
