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
import { Link } from "@tanstack/react-router";
import { ConnectButton } from "../components/ConnectButton";
import {
  Copy,
  Flame,
  Link2,
  Loader2,
  Save,
  ShoppingBag,
  User,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMembership, useProfile, useSaveProfile } from "../hooks/useBackend";
import { useAuth } from "../hooks/useAuth";
import { useMyNftTokenIds } from "../hooks/useMyNftIds";
import { getNftImageUrl } from "../lib/nft-config";
import { usePageTitle } from "../hooks/usePageTitle";

function truncatePid(p: string, head = 6, tail = 6) {
  if (p.length <= head + tail + 3) return p;
  return `${p.slice(0, head)}…${p.slice(-tail)}`;
}

export default function ProfilePage() {
  usePageTitle("Profile");

  const { isAuthenticated, isInitializing, principal } = useAuth();
  const { data: profile, isPending: profilePending } = useProfile();
  const { data: membership } = useMembership();
  const { data: tokenIds, isLoading: nftsLoading } = useMyNftTokenIds();
  const saveProfile = useSaveProfile();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile && !dirty) {
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile, dirty]);

  const pidText = principal?.toText() ?? "";
  const displayName =
    profile?.username && profile.username.length > 0
      ? profile.username
      : truncatePid(pidText);

  function copyPid() {
    if (!pidText) return;
    void navigator.clipboard.writeText(pidText).then(() =>
      toast.success("Principal copied"),
    );
  }

  async function handleSave() {
    try {
      await saveProfile.mutateAsync({
        username: username.trim() || "anonymous",
        bio: bio.trim(),
        // bindgen SaveProfileInput uses optional string (not []|[string])
        avatar_key:
          profile?.avatar_key?.length === 1
            ? profile.avatar_key[0]
            : undefined,
      });
      setDirty(false);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
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
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-border">
          <User className="h-12 w-12 text-primary" />
        </div>
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
              {new Date(Number(profile.created_at) / 1_000_000).toLocaleDateString()}
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
                    src={getNftImageUrl(id)}
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
            Community
          </Link>
        </Button>
      </div>
    </div>
  );
}
