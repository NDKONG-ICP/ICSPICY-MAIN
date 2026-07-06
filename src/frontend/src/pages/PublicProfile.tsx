/**
 * /u/:principalOrUsername — public grower profile page.
 * Banner, avatar, badges, bio, stats, MySpace-style Top 8, and
 * Posts / Plants / NFTs tabs. One composed backend query
 * (getPublicProfileFull) powers the header.
 */
import { type Backend, createActor } from "@/backend";
import {
  FeedSkeleton,
  FollowButton,
  PostCard,
  TipDialog,
} from "@/components/community";
import { ProfileWallpaperLayer } from "@/components/community/ProfileWallpaperLayer";
import { Top8Editor } from "@/components/community/Top8Editor";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PostPublic, _SERVICE } from "@/declarations/backend.did";
import { useActor } from "@/hooks/useActor";
import { useAuth } from "@/hooks/useAuth";
import { useNftTokenIdsForPrincipal } from "@/hooks/useMyNftIds";
import {
  usePublicProfileFull,
  useResolvedProfilePrincipal,
  useUserPlantsPublic,
} from "@/hooks/usePublicProfilePage";
import { uploadBanner } from "@/lib/banner-upload";
import {
  downloadProfileShareCard,
  renderProfileShareCard,
} from "@/lib/profile-share-card";
import { getNftImageUrl } from "@/lib/nft-config";
import { uploadsUrl } from "@/lib/uploads-canister";
import type { ActorSubclass } from "@dfinity/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Coins,
  Download,
  Leaf,
  Loader2,
  MapPin,
  Pencil,
  Share2,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Seo } from "../components/Seo";

function rawService(actor: Backend | null): ActorSubclass<_SERVICE> | null {
  if (!actor) return null;
  return (actor as unknown as { actor: ActorSubclass<_SERVICE> }).actor;
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

function memberSince(nanos: bigint): string {
  const d = new Date(Number(nanos / 1_000_000n));
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function plantStageLabel(stage: object): string {
  const key = Object.keys(stage)[0] ?? "";
  return key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export default function PublicProfilePage() {
  const params = useParams({ strict: false }) as {
    user?: string;
    principal?: string;
  };
  const userParam = params.user ?? params.principal;
  const { principal: callerPrincipal, isAuthenticated } = useAuth();
  const { actor } = useActor<Backend>(createActor);
  const qc = useQueryClient();

  const { principal, isResolving, notFound } =
    useResolvedProfilePrincipal(userParam);
  const { data: full, isPending } = usePublicProfileFull(principal);
  const { data: posts, isPending: postsPending } = useUserPosts(principal);
  const { data: plants = [], isPending: plantsPending } =
    useUserPlantsPublic(principal);
  const { data: nftIds = [] } = useNftTokenIdsForPrincipal(principal);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [shareCardLoading, setShareCardLoading] = useState(false);

  const isOwnProfile =
    !!callerPrincipal &&
    !!principal &&
    callerPrincipal.toText() === principal.toText();

  const profile = full?.profile;
  const name =
    profile && profile.username.trim().length > 0
      ? profile.username
      : (principal?.toText().slice(0, 12) ?? "Grower");
  const bannerKey = full?.banner_key.length === 1 ? full.banner_key[0] : null;
  const wallpaperKey =
    full?.wallpaper_key.length === 1 ? full.wallpaper_key[0] : null;
  const avatarKey =
    profile?.avatar_key.length === 1 ? profile.avatar_key[0] : undefined;
  const bioText = profile?.bio.trim() ?? "";
  const latestPost = posts?.find((p) => !p.is_anonymous);

  const profileUrl = `https://www.icspicy.app/u/${principal?.toText() ?? ""}`;

  const handleShareLink = async () => {
    const shareData = {
      title: `${name} on IC SPICY`,
      text: bioText || `Check out ${name}'s grower profile on IC SPICY`,
      url: profileUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard (user may have dismissed the sheet)
      }
    }
    await navigator.clipboard.writeText(profileUrl);
    toast.success("Profile link copied");
  };

  const handleDownloadShareCard = async () => {
    if (!principal || !profile || !full) return;
    setShareCardLoading(true);
    try {
      const dataUrl = await renderProfileShareCard({
        displayName: name,
        principalText: principal.toText(),
        profileUrl,
        followerCount: Number(profile.follower_count),
        plantsGrowing: Number(full.plants_growing),
        isPepperhead: full.is_pepperhead,
        isRaven: full.is_raven,
        avatarKey,
        bannerKey: bannerKey ?? undefined,
        wallpaperKey: wallpaperKey ?? undefined,
      });
      const safeName = name.replace(/[^\w-]+/g, "-").slice(0, 32) || "profile";
      downloadProfileShareCard(dataUrl, `icspicy-${safeName}-card.png`);
      toast.success("Profile card downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create share card");
    } finally {
      setShareCardLoading(false);
    }
  };

  const handleBannerFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBannerUploading(true);
    try {
      await uploadBanner(actor, file);
      toast.success("Banner updated");
      void qc.invalidateQueries({ queryKey: ["profile", "full"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Banner upload failed");
    } finally {
      setBannerUploading(false);
    }
  };

  if (!userParam || notFound) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
        {notFound ? "No grower found with that name." : "Invalid profile URL."}
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/community">Back to Community Garden</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isResolving || (isPending && !full)) {
    return (
      <div className="max-w-3xl mx-auto pb-16">
        <Skeleton className="h-44 sm:h-56 rounded-b-2xl" />
        <div className="px-4 -mt-10 space-y-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
    );
  }

  if (!profile || !principal) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
        This grower hasn't set up a community profile yet.
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/community">Back to Community Garden</Link>
          </Button>
        </div>
      </div>
    );
  }

  const seoTitle = `${name} — Grower Profile | IC SPICY`;
  const seoDescription =
    bioText.length > 0
      ? bioText.slice(0, 160)
      : `${name} grows with IC SPICY — regenerative farming, on-chain provenance, and the community CookBook.`;

  return (
    <div className="relative min-h-screen" data-ocid="public-profile-page">
      <ProfileWallpaperLayer wallpaperKey={wallpaperKey} />
      <div className="max-w-3xl mx-auto pb-20 relative">
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={`/u/${principal.toText()}`}
        ogType="profile"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name,
            description: bioText || undefined,
            url: profileUrl,
            ...(profile.location.length === 1
              ? { homeLocation: { "@type": "Place", name: profile.location[0] } }
              : {}),
          },
        }}
      />

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="relative h-44 sm:h-60 rounded-b-2xl overflow-hidden border-b border-border">
        {bannerKey ? (
          <img
            src={uploadsUrl(bannerKey)}
            alt={`${name}'s banner`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/35 via-background to-fire/25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        {isOwnProfile ? (
          <>
            <button
              type="button"
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/50 backdrop-blur px-3 py-1.5 text-xs text-white hover:bg-black/70 transition-colors"
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
            >
              {bannerUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {bannerKey ? "Change banner" : "Add banner"}
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload banner image"
              title="Upload banner image"
              onChange={(e) => {
                void handleBannerFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        ) : null}
      </div>

      <div className="px-4">
        <Link
          to="/community"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Community Garden
        </Link>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <motion.div
          className="-mt-12 sm:-mt-14 relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <CommunityAvatar
              principalText={principal.toText()}
              username={name}
              avatarKey={avatarKey}
              className="w-24 h-24 sm:w-28 sm:h-28 text-2xl ring-4 ring-background"
            />
            <div className="flex gap-2 flex-wrap items-center pb-1">
              {isOwnProfile ? (
                <>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to="/profile">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit profile
                    </Link>
                  </Button>
                  <Top8Editor
                    me={principal}
                    currentTop8={full.top8.map((t) => t.principal_id)}
                  />
                </>
              ) : (
                <>
                  {isAuthenticated ? <FollowButton target={principal} /> : null}
                  {latestPost ? (
                    <TipDialog
                      postId={latestPost.id}
                      recipientPrincipalText={principal.toText()}
                      triggerLabel="💰 Tip"
                    />
                  ) : null}
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    aria-label="Share profile"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void handleShareLink()}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void handleDownloadShareCard()}
                    disabled={shareCardLoading}
                  >
                    {shareCardLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download profile card
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-2xl sm:text-3xl truncate">
              {name}
            </h1>
            {full.is_pepperhead ? (
              <Badge
                variant="outline"
                className="border-fire/40 text-fire text-xs"
                title="Owns a PepperHead NFT"
              >
                🌶️ PepperHead
              </Badge>
            ) : null}
            {full.is_raven ? (
              <Badge
                variant="outline"
                className="border-primary/40 text-primary text-xs"
                title="RAVEN member"
              >
                🐦‍⬛ Raven
              </Badge>
            ) : null}
            {profile.is_admin ? (
              <Badge variant="outline" className="text-xs">
                admin
              </Badge>
            ) : null}
          </div>

          {bioText.length > 0 ? (
            <p className="mt-3 text-sm text-foreground leading-relaxed max-w-xl whitespace-pre-wrap break-words">
              {bioText}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {profile.location.length === 1 ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location[0]}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Member since {memberSince(profile.created_at)}
            </span>
          </div>

          {/* ── Stats row ─────────────────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm rounded-xl border border-border/60 bg-card/55 backdrop-blur px-4 py-3">
            <span>
              <strong>{profile.post_count.toString()}</strong>{" "}
              <span className="text-muted-foreground">posts</span>
            </span>
            <span>
              <strong>{profile.follower_count.toString()}</strong>{" "}
              <span className="text-muted-foreground">followers</span>
            </span>
            <span>
              <strong>{profile.following_count.toString()}</strong>{" "}
              <span className="text-muted-foreground">following</span>
            </span>
            <span>
              <strong>{full.plants_growing.toString()}</strong>{" "}
              <span className="text-muted-foreground">plants growing</span>
            </span>
            {full.nft_count > 0n ? (
              <span>
                <strong>{full.nft_count.toString()}</strong>{" "}
                <span className="text-muted-foreground">NFTs</span>
              </span>
            ) : null}
          </div>
        </motion.div>

        {/* ── Top 8 ─────────────────────────────────────────────────────────── */}
        {full.top8.length > 0 ? (
          <section className="mt-8" aria-label="Top 8 friends">
            <h2 className="font-display font-semibold mb-3">
              {isOwnProfile ? "Your Top 8" : `${name}'s Top 8`}
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {full.top8.map((friend, i) => {
                const fpid = friend.principal_id.toText();
                const fname =
                  friend.username.trim().length > 0
                    ? friend.username
                    : `…${fpid.slice(-5)}`;
                return (
                  <Link
                    key={fpid}
                    to="/u/$user"
                    params={{ user: fpid }}
                    className="group rounded-xl border border-border/60 bg-card/55 backdrop-blur p-2 sm:p-3 text-center hover:border-primary/40 transition-colors"
                    data-ocid={`top8-slot-${i + 1}`}
                  >
                    <CommunityAvatar
                      principalText={fpid}
                      username={fname}
                      avatarKey={
                        friend.avatar_key.length === 1
                          ? friend.avatar_key[0]
                          : undefined
                      }
                      className="w-12 h-12 sm:w-16 sm:h-16 text-sm mx-auto"
                    />
                    <p className="mt-1.5 text-[11px] sm:text-xs font-medium truncate group-hover:text-primary transition-smooth">
                      {fname}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : isOwnProfile ? (
          <section className="mt-8 rounded-xl border border-dashed border-border/70 bg-card/40 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Curate a MySpace-style Top 8 from the growers you follow.
            </p>
            <Top8Editor me={principal} currentTop8={[]} />
          </section>
        ) : null}

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="posts" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="plants">Plants</TabsTrigger>
            <TabsTrigger value="nfts">NFTs</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {postsPending ? (
              <FeedSkeleton />
            ) : posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id.toString()} post={post} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-6 text-center">
                No posts yet.
              </p>
            )}
          </TabsContent>

          <TabsContent value="plants" className="mt-4">
            {plantsPending ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : plants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {plants.map((plant) => {
                  const photo =
                    plant.photo_keys[0] ?? plant.photos[0] ?? undefined;
                  return (
                    <Link
                      key={plant.id.toString()}
                      to="/plant/$plantId"
                      params={{ plantId: plant.id.toString() }}
                      className="rounded-xl border border-border/60 bg-card/55 backdrop-blur overflow-hidden hover:border-primary/40 transition-colors"
                    >
                      {photo ? (
                        <img
                          src={uploadsUrl(photo)}
                          alt={plant.variety}
                          className="w-full h-24 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-24 bg-primary/10 flex items-center justify-center">
                          <Leaf className="w-6 h-6 text-primary/50" />
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold truncate">
                          {plant.common_name.length === 1
                            ? plant.common_name[0]
                            : plant.variety}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {plantStageLabel(plant.stage)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-6 text-center">
                No plants being tracked publicly.
              </p>
            )}
          </TabsContent>

          <TabsContent value="nfts" className="mt-4">
            {nftIds.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {nftIds.slice(0, 24).map((id) => (
                  <Link
                    key={id.toString()}
                    to="/nft/$tokenId"
                    params={{ tokenId: id.toString() }}
                    className="rounded-lg border border-border overflow-hidden aspect-square hover:border-primary/40 transition-colors"
                  >
                    <img
                      src={getNftImageUrl(id)}
                      alt={`NFT #${id.toString()}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-6 text-center flex items-center justify-center gap-1.5">
                <Coins className="w-4 h-4" />
                No IC SPICY NFTs owned.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}
