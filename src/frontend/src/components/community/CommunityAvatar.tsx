import { Principal } from "@icp-sdk/core/principal";
import { usePublicCommunityProfile } from "../../hooks/useProfile";
import {
  isAvatarPath,
  principalAvatarColor,
  principalInitials,
} from "../../lib/avatar-upload";
import { isCommunityPhotoPath } from "../../lib/community-image-upload";
import { StoredProfilePhoto } from "./StoredProfilePhoto";

const SIZE_CLASS = {
  sm: "w-8 h-8 text-[10px]",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
} as const;

export function CommunityAvatar({
  principalText,
  username,
  avatarKey,
  size = "md",
  className,
}: {
  principalText: string;
  username?: string;
  avatarKey?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const principalObj = Principal.fromText(principalText);
  const { data: profile } = usePublicCommunityProfile(
    avatarKey ? undefined : principalObj,
  );

  const resolvedKey =
    avatarKey ??
    (profile?.avatar_key.length === 1 ? profile.avatar_key[0] : undefined);

  const initials = principalInitials(
    username ?? profile?.username,
    principalText,
  );
  const bg = principalAvatarColor(principalText);
  const sizeCls = className ?? SIZE_CLASS[size];

  const showPhoto =
    resolvedKey &&
    (isAvatarPath(resolvedKey) || isCommunityPhotoPath(resolvedKey));

  if (showPhoto && resolvedKey) {
    return (
      <StoredProfilePhoto
        path={resolvedKey}
        alt=""
        className={`${sizeCls} rounded-full object-cover shrink-0`}
        fallback={
          <div
            className={`${sizeCls} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
            style={{ backgroundColor: bg }}
          >
            {initials}
          </div>
        }
      />
    );
  }

  return (
    <div
      className={`${sizeCls} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
