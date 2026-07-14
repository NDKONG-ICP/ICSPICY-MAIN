import { type Backend, createActor } from "@/backend";
import { AvatarUpload } from "@/components/community/AvatarUpload";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import {
  usePublicProfileFull,
  useSetProfileWallpaper,
} from "@/hooks/usePublicProfilePage";
import {
  WALLPAPER_PRESETS,
  parseWallpaperKey,
  presetWallpaperValue,
  type WallpaperPresetId,
} from "@/lib/profile-wallpapers";
import { uploadWallpaper } from "@/lib/wallpaper-upload";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Copy,
  Flame,
  ImagePlus,
  Link2,
  Loader2,
  Save,
  ShoppingBag,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { ConnectButton } from "../components/ConnectButton";
import { useAuth } from "../hooks/useAuth";
import { useMembership, useProfile, useSaveProfile } from "../hooks/useBackend";
import { useMyNftTokenIds } from "../hooks/useMyNftIds";
import { NoIndexSeo } from "../components/NoIndexSeo";
import { usePageTitle } from "../hooks/usePageTitle";
import { resolveNftImageUrl } from "../lib/nft-config";
import { requireBackendRaw } from "@/lib/backend-raw";
import { useQuery } from "@tanstack/react-query";

function truncatePid(p: string, head = 6, tail = 6) {
  if (p.length <= head + tail + 3) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

export default function ProfilePage() {
  usePageTitle("Profile");

  const { isAuthenticated, isInitializing, principal } = useAuth();
  const { actor } = useActor<Backend>(createActor);
  const { data: profile, isPending: profilePending } = useProfile();
  const { data: profileFull } = usePublicProfileFull(principal ?? undefined);
  const setWallpaper = useSetProfileWallpaper();
  const qc = useQueryClient();
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const [wallpaperUploading, setWallpaperUploading] = useState(false);
  const { data: membership } = useMembership();
  const { data: tokenIds, isLoading: nftsLoading } = useMyNftTokenIds();
  const { data: badges = [] } = useQuery({
    queryKey: ["achievements", "badges", principal?.toText()],
    queryFn: async () => {
      if (!principal) return [];
      const raw = requireBackendRaw(actor);
      return raw.getBadgesByPrincipal(principal);
    },
    enabled: !!actor && !!principal,
  });
  const badgeTypeByTokenId = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of badges) {
      map.set(b.tokenId.toString(), b.badgeType);
    }
    return map;
  }, [badges]);
  const saveProfile = useSaveProfile();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarKey, setAvatarKey] = useState<string | undefined>();
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile && !dirty) {
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      // Wrapper actor returns avatar_key as a plain string, not a Candid opt array.
      setAvatarKey(profile.avatar_key || undefined);
    }
  }, [profile, dirty]);

  const pidText = principal?.toText() ?? "";
  const currentWallpaper =
    profileFull?.wallpaper_key.length === 1
      ? profileFull.wallpaper_key[0]
      : null;
  const currentWallpaperParsed = parseWallpaperKey(currentWallpaper);
  const displayName =
    profile?.username && profile.username.length > 0
      ? profile.username
      : truncatePid(pidText);

  function copyPid() {
    if (!pidText) return;
    void navigator.clipboard
      .writeText(pidText)
      .then(() => toast.success("Principal copied"));
  }

  async function handleSave() {
    try {
      await saveProfile.mutateAsync({
        username: username.trim() || "anonymous",
        bio: bio.trim(),
        avatar_key: avatarKey,
        location: location.trim() || undefined,
      });
      setDirty(false);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handlePresetWallpaper(id: WallpaperPresetId) {
    try {
      await setWallpaper.mutateAsync(presetWallpaperValue(id));
      toast.success("Wallpaper updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set wallpaper");
    }
  }

  async function handleClearWallpaper() {
    try {
      await setWallpaper.mutateAsync("");
      toast.success("Wallpaper removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear wallpaper");
    }
  }

  async function handleWallpaperFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setWallpaperUploading(true);
    try {
      await uploadWallpaper(actor, file);
      void qc.invalidateQueries({ queryKey: ["profile", "full"] });
      toast.success("Wallpaper uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wallpaper upload failed");
    } finally {
      setWallpaperUploading(false);
    }
  }

  if (!isInitializing && !isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6 px-4">
        <User className="h-14 w-14 mx-auto text-primary opacity-90" />
        <h1 className="font-display text-3xl font-bold text-foreground">
          Profile
        </h1>
        <p className="text-muted-foreground">
          Sign in with your wallet to view and edit your community profile.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-4xl mx-auto space-y-8 px-4 pb-16"
      data-ocid="profile-page"
    >
      <NoIndexSeo title="Profile | IC SPICY" path="/profile" />
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        {pidText ? (
          <AvatarUpload
            principalText={pidText}
            username={username}
            avatarKey={avatarKey}
            onAvatarKey={(key) => {
              setAvatarKey(key);
              setDirty(true);
            }}
            size="lg"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-border">
            <User className="h-12 w-12 text-primary" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <code className="font-mono text-xs bg-muted/40 px-2 py-1 rounded">
              {truncatePid(pidText)}
            </code>
            <Button type="button" variant="ghost" size="sm" onClick={copyPid}>
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
            {pidText ? (
              <Button asChild type="button" variant="outline" size="sm">
                <Link to="/u/$user" params={{ user: pidText }}>
                  View public profile
                </Link>
              </Button>
            ) : null}
            {membership && (
              <Badge
                variant="outline"
                className="text-emerald-400 border-emerald-500/30"
              >
                Member
              </Badge>
            )}
          </div>
          {profile?.created_at != null && (
            <p className="text-xs text-muted-foreground">
              Member since{" "}
              {new Date(
                Number(profile.created_at) / 1_000_000,
              ).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>
            Stored on-chain — username and bio are visible to others.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profilePending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Display name</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    setDirty(true);
                  }}
                  rows={4}
                  placeholder="Tell the community about your grow…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="e.g. Zone 8a Arkansas"
                />
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveProfile.isPending || !dirty}
                className="gap-2"
              >
                {saveProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Profile wallpaper</CardTitle>
          <CardDescription>
            Full-page background on your public profile — presets are free;
            custom images up to 2 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WALLPAPER_PRESETS.map((preset) => {
              const selected =
                currentWallpaperParsed?.kind === "preset" &&
                currentWallpaperParsed.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={[
                    "relative h-20 rounded-lg border-2 overflow-hidden transition-colors",
                    selected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50",
                  ].join(" ")}
                  style={preset.style}
                  onClick={() => void handlePresetWallpaper(preset.id)}
                  disabled={setWallpaper.isPending}
                  aria-label={`${preset.name} wallpaper`}
                  aria-pressed={selected ? "true" : "false"}
                >
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 text-[10px] text-white font-medium py-0.5">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => wallpaperInputRef.current?.click()}
              disabled={wallpaperUploading}
            >
              {wallpaperUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              Upload custom
            </Button>
            <input
              ref={wallpaperInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload profile wallpaper"
              title="Upload profile wallpaper"
              onChange={(e) => {
                void handleWallpaperFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {currentWallpaper ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => void handleClearWallpaper()}
                disabled={setWallpaper.isPending}
              >
                <X className="h-4 w-4" />
                Remove wallpaper
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
          <Flame className="h-6 w-6 text-red-500" />
          My NFTs
        </h2>
        {nftsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : !tokenIds?.length ? (
          <p className="text-muted-foreground text-sm">No NFTs yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tokenIds.slice(0, 24).map((id) => (
              <Link
                key={id.toString()}
                to="/nft/$tokenId"
                params={{ tokenId: id.toString() }}
                className="rounded-lg border border-border overflow-hidden bg-card hover:border-primary/40 transition-colors"
              >
                <div className="aspect-square bg-muted">
                  <img
                    src={resolveNftImageUrl(
                      id,
                      badgeTypeByTokenId.get(id.toString()),
                    )}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-center text-sm py-2 font-medium">
                  #{id.toString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            My orders
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/wallet" className="gap-2">
            <Wallet className="h-4 w-4" />
            My wallet
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/community" className="gap-2">
            <Link2 className="h-4 w-4" />
            Community Garden
          </Link>
        </Button>
      </div>
    </div>
  );
}
