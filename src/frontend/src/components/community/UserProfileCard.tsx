import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import type { UserProfilePublic } from "../../declarations/backend.did";
import { isCommunityPhotoPath } from "../../lib/community-image-upload";
import { CommunityStoredPhoto } from "./CommunityStoredPhoto";

export function UserProfileCard({
  profile,
  compact = true,
  children,
}: {
  profile: UserProfilePublic | null | undefined;
  compact?: boolean;
  children?: ReactNode;
}) {
  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        Community profile unavailable.
      </div>
    );
  }

  const name =
    profile.username.trim().length > 0
      ? `@${profile.username}`
      : `…${profile.principal_id.toText().slice(-5)}`;

  const avatarKeyOpt = profile.avatar_key;
  const avatarPath =
    avatarKeyOpt.length === 1 && isCommunityPhotoPath(avatarKeyOpt[0]!)
      ? avatarKeyOpt[0]!
      : undefined;

  const bio = profile.bio.trim();

  const size = compact ? "w-11 h-11" : "w-14 h-14";

  return (
    <div
      className="flex gap-3 min-w-0 rounded-xl bg-card border border-border p-3 shadow-subtle"
      data-ocid="community-user-profile-card"
    >
      <div
        className={[
          size,
          "shrink-0 rounded-full overflow-hidden ring-2 ring-border bg-muted/40 relative",
        ].join(" ")}
      >
        {avatarPath ? (
          <CommunityStoredPhoto
            path={avatarPath}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-primary/15 text-primary text-sm font-semibold">
                {name.replace("@", "").slice(0, 2).toUpperCase()}
              </div>
            }
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-primary bg-primary/15">
            {name.replace("@", "").slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">
            {name}
          </span>
          {profile.is_admin && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 h-5 border-primary/35 text-primary"
            >
              admin
            </Badge>
          )}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
          {bio.length > 0
            ? bio
            : "No bio yet — open profile settings to introduce your grow-op."}
        </p>
        {profile.location.length === 1 && (
          <p className="text-[10px] text-muted-foreground/80 truncate">
            📍 {profile.location[0]}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
