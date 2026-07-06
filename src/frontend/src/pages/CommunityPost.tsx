import { FeedSkeleton } from "@/components/community";
import { PostCard } from "@/components/community/PostCard";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePostWithComments } from "@/hooks/usePost";
import { getPostAuthorDisplayName } from "@/lib/community-utils";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";

function parsePostId(raw: string | undefined): bigint | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const id = BigInt(raw);
    if (id < 0n) return undefined;
    return id;
  } catch {
    return undefined;
  }
}

export default function CommunityPostPage() {
  const params = useParams({ strict: false }) as { postId?: string };
  const postId = useMemo(() => parsePostId(params.postId), [params.postId]);

  const { data, isPending, isError } = usePostWithComments(postId);

  usePageTitle(
    data?.post
      ? `${getPostAuthorDisplayName(data.post)} · Community Garden`
      : postId !== undefined
        ? "Community Garden Post"
        : "Post not found",
  );

  if (postId === undefined) {
    return (
      <div
        className="max-w-2xl mx-auto py-20 text-center px-4"
        data-ocid="community-post-not-found"
      >
        <h1 className="font-display font-bold text-xl mb-2">Post not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This link is invalid or the post was removed.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/community">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Community Garden
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="max-w-2xl mx-auto px-1 pb-24"
      data-ocid="community-post-page"
    >
      <div className="mb-4">
        <Link
          to="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-smooth"
          data-ocid="community-post-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community Garden
        </Link>
      </div>

      {isPending ? (
        <FeedSkeleton />
      ) : isError || !data ? (
        <div
          className="text-center py-20 rounded-2xl border border-dashed border-border/70 bg-muted/15"
          data-ocid="community-post-not-found"
        >
          <span className="text-4xl mb-4 block">🌶️</span>
          <h1 className="font-display font-bold text-xl mb-2">
            Post not found
          </h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            This post may have been deleted or the link is incorrect.
          </p>
          <Button asChild size="sm" className="bg-primary">
            <Link to="/community">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Community Garden
            </Link>
          </Button>
        </div>
      ) : (
        <PostCard post={data.post} initialCommentsOpen />
      )}
    </div>
  );
}
