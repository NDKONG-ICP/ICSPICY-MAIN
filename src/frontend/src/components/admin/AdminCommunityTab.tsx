import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgoNanos } from "@/lib/community-utils";
import {
  ADMIN_COMMUNITY_PAGE_SIZE,
  useAdminCommunityPosts,
  useAdminDeletePost,
  useBanUser,
  useIsUserBanned,
  useUnbanUser,
} from "@/hooks/useCommunityAdmin";
import { Principal } from "@icp-sdk/core/principal";
import { Shield, Trash2, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function AdminCommunityTab() {
  const [offset, setOffset] = useState(0n);
  const { data: posts, isPending, refetch } = useAdminCommunityPosts(offset);
  const deletePost = useAdminDeletePost();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();

  const [banPrincipal, setBanPrincipal] = useState("");
  const banPrincipalParsed = useMemo(() => {
    if (!banPrincipal.trim()) return undefined;
    try {
      return Principal.fromText(banPrincipal.trim());
    } catch {
      return undefined;
    }
  }, [banPrincipal]);
  const bannedCheck = useIsUserBanned(banPrincipalParsed);

  const handleDeletePost = async (id: bigint) => {
    try {
      await deletePost.mutateAsync(id);
      toast.success("Post deleted.");
      void refetch();
    } catch {
      toast.error("Failed to delete post.");
    }
  };

  const handleBan = async () => {
    if (!banPrincipalParsed) {
      toast.error("Invalid principal.");
      return;
    }
    try {
      if (bannedCheck.data) {
        await unbanUser.mutateAsync(banPrincipalParsed);
        toast.success("User unbanned.");
      } else {
        await banUser.mutateAsync(banPrincipalParsed);
        toast.success("User banned.");
      }
      setBanPrincipal("");
    } catch {
      toast.error("Action failed.");
    }
  };

  return (
    <div className="space-y-6" data-ocid="admin-community-tab">
      <div>
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Community Moderation
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Admin view reveals anonymous authors. Reported content workflow is
          planned for a future release.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium">User management</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Principal to ban/unban"
            value={banPrincipal}
            onChange={(e) => setBanPrincipal(e.target.value)}
            className="max-w-md font-mono text-xs"
          />
          <Button
            size="sm"
            variant={bannedCheck.data ? "outline" : "destructive"}
            onClick={handleBan}
            disabled={!banPrincipal.trim()}
          >
            <UserX className="w-3.5 h-3.5 mr-1" />
            {bannedCheck.data ? "Unban" : "Ban"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">All posts (newest first)</h3>
        {isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id.toString()}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      Post #{post.id.toString()}
                    </span>
                    {post.is_anonymous && (
                      <Badge variant="outline" className="text-[10px]">
                        anon →{" "}
                        {post.author_principal.length === 1
                          ? `${post.author_principal[0]!.toText().slice(0, 8)}…`
                          : "?"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {post.author_username.length === 1
                      ? `@${post.author_username[0]}`
                      : post.author_text}{" "}
                    · {timeAgoNanos(post.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => handleDeletePost(post.id)}
                  disabled={deletePost.isPending}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
              <p className="text-sm break-words">{post.content}</p>
              <p className="text-xs text-muted-foreground">
                ❤️ {post.like_count.toString()} · 💬{" "}
                {post.comment_count.toString()} · 🌶️{" "}
                {post.tip_count.toString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No community posts.</p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0n}
            onClick={() =>
              setOffset(
                offset > ADMIN_COMMUNITY_PAGE_SIZE
                  ? offset - ADMIN_COMMUNITY_PAGE_SIZE
                  : 0n,
              )
            }
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!posts || posts.length < Number(ADMIN_COMMUNITY_PAGE_SIZE)}
            onClick={() => setOffset(offset + ADMIN_COMMUNITY_PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
