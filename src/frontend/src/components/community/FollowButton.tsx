import { Button } from "@/components/ui/button";
import type { Principal } from "@icp-sdk/core/principal";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useFollowMutation, useIsFollowing } from "../../hooks/useFollow";

export function FollowButton({
  target,
  className,
  size = "sm",
}: {
  target: Principal | undefined;
  className?: string;
  /** @default \"sm\" */
  size?: "sm" | "default";
}) {
  const { isAuthenticated, login, principal } = useAuth();
  const mut = useFollowMutation();
  const { data: following, isPending: followQueryBusy } =
    useIsFollowing(target);

  if (!target || principal?.toText() === target.toText()) {
    return null;
  }

  const pending = mut.isPending;

  const onClick = () => {
    if (!isAuthenticated) {
      toast.message("Sign in to follow growers");
      login();
      return;
    }
    if (following === undefined) return;

    mut.mutate(
      { target, follow: !following },
      {
        onSuccess: () => toast.success(following ? "Unfollowed" : "Following"),
        onError: () => toast.error("Could not update follow"),
      },
    );
  };

  const label = (() => {
    if (!isAuthenticated) return "Follow";
    if (followQueryBusy || following === undefined) return "…";
    return following ? "Unfollow" : "Follow";
  })();

  const h =
    size === "sm"
      ? "h-8 px-3 text-xs border-border hover:border-primary/50"
      : "h-9 px-4 text-sm border-border hover:border-primary/50";

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={[h, className ?? ""].join(" ")}
      disabled={
        pending ||
        (isAuthenticated && (following === undefined || followQueryBusy))
      }
      onClick={onClick}
      data-ocid="community-follow-button"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : label}
    </Button>
  );
}
