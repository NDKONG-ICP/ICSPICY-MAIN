import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import type { UserProfilePublic } from "../../declarations/backend.did";
import { CommunityAvatar } from "./CommunityAvatar";

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

  const avatarPath =
    profile.avatar_key.length === 1 ? profile.avatar_key[0] : undefined;

  const bio = profile.bio.trim();

  const size = compact ? "w-11 h-11" : "w-14 h-14";

  return (
    <div
      className="flex gap-3 min-w-0 rounded-xl bg-card border border-border p-3 shadow-subtle"
      data-ocid="community-user-profile-card"
    >
      <CommunityAvatar
        principalText={profile.principal_id.toText()}
        username={profile.username}
        avatarKey={avatarPath}
        className={size}
      />
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
