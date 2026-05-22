import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FeedSkeleton,
  PostCard,
  PostComposer,
} from "@/components/community";
import { AvatarUpload } from "@/components/community/AvatarUpload";
import type { FeedMode } from "@/hooks/useCommunityFeed";
import {
  flattenCommunityFeedPages,
  useInfiniteCommunityFeed,
} from "@/hooks/useCommunityFeed";
import {
  useMyCommunityProfile,
  useSaveCommunityProfile,
} from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";

const FEED_TABS: { mode: FeedMode; label: string }[] = [
  { mode: "global", label: "Global" },
  { mode: "following", label: "Following" },
  { mode: "trending", label: "Trending" },
];

function ProfileSetupDialog({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => void;
}) {
  const saveProfile = useSaveCommunityProfile();
  const { principal } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarKey, setAvatarKey] = useState<string | undefined>();

  const pidText = principal?.toText() ?? "";

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required.");
      return;
    }
    try {
      await saveProfile.mutateAsync({
        username: displayName.trim(),
        bio: bio.trim(),
        avatar_key: avatarKey ? [avatarKey] : [],
        location: location.trim() ? [location.trim()] : [],
      });
      toast.success("Profile created! Welcome to the community 🌶️");
      onComplete();
    } catch {
      toast.error("Failed to save profile.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" data-ocid="community-profile-setup">
        <DialogHeader>
          <DialogTitle>Create your community profile</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          A profile is required to post, like, comment, and tip in the IC SPICY
          community.
        </p>
        <div className="space-y-3">
          {pidText ? (
            <AvatarUpload
              principalText={pidText}
              username={displayName}
              avatarKey={avatarKey}
              onAvatarKey={setAvatarKey}
            />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="setup-name">Display name *</Label>
            <Input
              id="setup-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="PepperGrower42"
              maxLength={64}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-bio">Bio</Label>
            <Textarea
              id="setup-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell the community about your grow…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setup-location">Location</Label>
            <Input
              id="setup-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Port Charlotte, FL"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-primary"
            onClick={handleSave}
            disabled={saveProfile.isPending || !displayName.trim()}
          >
            {saveProfile.isPending ? "Saving…" : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CommunityPage() {
  usePageTitle("Community");

  const { isAuthenticated, login } = useAuth();
  const { data: profile, isPending: profilePending } = useMyCommunityProfile();
  const [feedMode, setFeedMode] = useState<FeedMode>("global");
  const [showComposer, setShowComposer] = useState(false);
  const [profileSetupDone, setProfileSetupDone] = useState(false);

  const feed = useInfiniteCommunityFeed(feedMode);
  const posts = flattenCommunityFeedPages(feed.data?.pages);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const needsProfile =
    isAuthenticated &&
    !profilePending &&
    !profileSetupDone &&
    (!profile || !profile.username || profile.username.length === 0);

  useEffect(() => {
    if (!feed.hasNextPage || feed.isFetchingNextPage) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void feed.fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage]);

  return (
    <div data-ocid="community-page" className="max-w-2xl mx-auto px-1 pb-24">
      <ProfileSetupDialog
        open={needsProfile}
        onComplete={() => setProfileSetupDone(true)}
      />

      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-1">
              🌶️ IC SPICY <span className="text-fire">Community</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Connect with fellow pepper growers — share harvests, tips, and
              wins.
            </p>
          </div>
          {isAuthenticated ? (
            <Button
              size="sm"
              className="bg-primary shrink-0 fixed bottom-6 right-4 z-30 shadow-elevated sm:static"
              onClick={() => setShowComposer((v) => !v)}
              data-ocid="community-new-post-btn"
            >
              {showComposer ? (
                <X className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {showComposer ? "Close" : "New Post"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={login}
              className="border-primary/40 text-primary shrink-0"
            >
              Sign in
            </Button>
          )}
        </div>

        <div className="flex gap-1 mt-4 p-1 rounded-xl bg-muted/30 border border-border">
          {FEED_TABS.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFeedMode(mode)}
              className={[
                "flex-1 text-xs sm:text-sm py-2 rounded-lg font-medium transition-smooth",
                feedMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              data-ocid={`community-feed-${mode}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showComposer && isAuthenticated && (
        <div className="mb-6">
          <PostComposer onPublished={() => setShowComposer(false)} />
        </div>
      )}

      {feed.isPending ? (
        <FeedSkeleton />
      ) : posts.length > 0 ? (
        <div className="space-y-4" data-ocid="post-list">
          {posts.map((post, i) => (
            <motion.div
              key={post.id.toString()}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}
          <div ref={loadMoreRef} className="h-8" />
          {feed.isFetchingNextPage && (
            <p className="text-center text-xs text-muted-foreground py-4">
              Loading more…
            </p>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-20 text-center"
          data-ocid="community-empty"
        >
          <span className="text-5xl mb-4">🌶️</span>
          <h3 className="font-display font-semibold text-lg mb-2">
            {feedMode === "following"
              ? "Follow growers to see their posts here"
              : "No posts yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            {feedMode === "following"
              ? "Browse the global feed and tap Follow on posts you enjoy."
              : "Be the first to share your chili journey with the community."}
          </p>
          {isAuthenticated && (
            <Button
              size="sm"
              className="bg-primary"
              onClick={() => setShowComposer(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Start the conversation
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
