import { type Backend, createActor } from "@/backend";
import { FeedSkeleton, FollowButton, PostCard } from "@/components/community";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostPublic } from "@/declarations/backend.did";
import type { _SERVICE } from "@/declarations/backend.did";
import { useActor } from "@/hooks/useActor";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteCommunityFeed } from "@/hooks/useCommunityFeed";
import { useMyNftTokenIds } from "@/hooks/useMyNftIds";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePublicCommunityProfile } from "@/hooks/useProfile";
import { getNftImageUrl } from "@/lib/nft-config";
import type { ActorSubclass } from "@dfinity/agent";
import { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import { useMemo } from "react";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return actor as unknown as ActorSubclass<_SERVICE>;
}

function useUserPosts(principal: Principal | undefined) {
  const { actor } = useActor<Backend>(createActor);
  const svc = rawService(actor);
  return useQuery({
    queryKey: ["community", "userPosts", principal?.toText()],
    queryFn: async (): Promise<PostPublic[]> => {
      if (!svc || !principal) return [];
      return svc.getUserPosts(principal, 0n, 50n);
    },
    enabled: !!svc && !!principal,
  });
}

export default function CommunityProfilePage() {
  const params = useParams({ strict: false }) as { principal?: string };
  const { principal: callerPrincipal, isAuthenticated } = useAuth();

  const profilePrincipal = useMemo(() => {
    if (!params.principal) return undefined;
    try {
      return Principal.fromText(params.principal);
    } catch {
      return undefined;
    }
  }, [params.principal]);

  const isOwnProfile =
    callerPrincipal &&
    profilePrincipal &&
    callerPrincipal.toText() === profilePrincipal.toText();

  const { data: profile, isPending } =
    usePublicCommunityProfile(profilePrincipal);
  usePageTitle(
    profile?.username?.trim().length
      ? `${profile.username} · Community`
      : "Community",
  );
  const { data: posts, isPending: postsPending } =
    useUserPosts(profilePrincipal);
  const { data: myTokenIds } = useMyNftTokenIds();
  const tokenIds = isOwnProfile ? myTokenIds : undefined;

  if (!profilePrincipal) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
        Invalid profile URL.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-16" data-ocid="community-profile-page">
      <div className="h-32 sm:h-40 rounded-b-2xl bg-gradient-to-br from-primary/30 via-background to-fire/20 border-b border-border mb-12 relative" />

      <div className="px-4 -mt-20">
        <Link
          to="/community"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to feed
        </Link>

        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-background flex items-center justify-center text-2xl font-bold text-primary shrink-0">
            {(profile?.username ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {isPending ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              <>
                <h1 className="font-display font-bold text-2xl truncate">
                  {profile?.username ?? "Unknown"}
                </h1>
                {profile?.location.length === 1 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.location[0]}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {isOwnProfile ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/profile">
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Link>
              </Button>
            ) : (
              isAuthenticated &&
              profilePrincipal && <FollowButton target={profilePrincipal} />
            )}
          </div>
        </div>

        {profile?.bio && (
          <p className="mt-4 text-sm text-foreground leading-relaxed">
            {profile.bio}
          </p>
        )}

        <div className="flex gap-6 mt-4 text-sm">
          <span>
            <strong>{profile?.post_count.toString() ?? "0"}</strong>{" "}
            <span className="text-muted-foreground">Posts</span>
          </span>
          <span>
            <strong>{profile?.follower_count.toString() ?? "0"}</strong>{" "}
            <span className="text-muted-foreground">Followers</span>
          </span>
          <span>
            <strong>{profile?.following_count.toString() ?? "0"}</strong>{" "}
            <span className="text-muted-foreground">Following</span>
          </span>
        </div>

        {isOwnProfile && tokenIds && tokenIds.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display font-semibold mb-3">My NFTs</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {tokenIds.slice(0, 8).map((id) => (
                <Link
                  key={id.toString()}
                  to="/nft/$tokenId"
                  params={{ tokenId: id.toString() }}
                  className="rounded-lg border border-border overflow-hidden aspect-square"
                >
                  <img
                    src={getNftImageUrl(id)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-display font-semibold mb-4">Posts</h2>
          {postsPending ? (
            <FeedSkeleton />
          ) : posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id.toString()} post={post} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No posts yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
