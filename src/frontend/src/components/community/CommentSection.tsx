import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { CommentPublic, PostId } from "../../declarations/backend.did";
import { useAuth } from "../../hooks/useAuth";
import {
  useCreateComment,
  usePostComments,
  useToggleLikeComment,
} from "../../hooks/usePost";
import {
  getCommentAuthorDisplay,
  getCommentAuthorInitial,
  timeAgoNanos,
} from "../../lib/community-utils";

export function CommentSection({
  postId,
  previewCount,
  initialOpen = false,
}: {
  postId: PostId;
  previewCount: bigint;
  initialOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialOpen);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");

  const { isAuthenticated, login } = useAuth();

  const { data: comments = [], isFetching } = usePostComments(
    expanded ? postId : undefined,
  );

  const createComment = useCreateComment();
  const toggleLike = useToggleLikeComment();

  const visibleComments: CommentPublic[] = showAll
    ? comments
    : comments.slice(0, 3);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed.length) return;
    if (trimmed.length > 500) {
      toast.error("Comments max 500 characters.");
      return;
    }
    if (!isAuthenticated) {
      login();
      return;
    }
    try {
      await createComment.mutateAsync({
        post_id: postId,
        content: trimmed,
        anonymous: false,
      });
      setDraft("");
      toast.success("Comment posted");
    } catch {
      toast.error("Could not publish comment.");
    }
  };

  const onToggleLike = (c: CommentPublic) => {
    if (!isAuthenticated) {
      login();
      return;
    }

    toggleLike.mutate(
      { commentId: c.id, postId },
      {
        onError: () => toast.error("Could not toggle like."),
      },
    );
  };

  return (
    <div className="space-y-1" data-ocid="community-comment-section">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-smooth"
      >
        <MessageCircle className="w-4 h-4" />
        {previewCount.toString()}
        <span className="sr-only">comments</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pl-3 border-l-2 border-border space-y-3">
              {isFetching && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </p>
              )}
              {!isFetching &&
                visibleComments.map((c) => (
                  <div
                    key={c.id.toString()}
                    className="flex gap-2.5 items-start"
                  >
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className="text-[11px] font-semibold bg-secondary text-secondary-foreground">
                        {getCommentAuthorInitial(c)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          <span className="text-foreground font-medium">
                            {getCommentAuthorDisplay(c)}
                          </span>{" "}
                          • {timeAgoNanos(c.created_at)}
                          {c.is_anonymous ? (
                            <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 rounded border border-border text-muted-foreground">
                              anon
                            </span>
                          ) : null}
                        </p>
                        <button
                          type="button"
                          onClick={() => onToggleLike(c)}
                          className={[
                            "flex items-center gap-1 text-[10px] shrink-0",
                            c.caller_liked
                              ? "text-primary"
                              : "text-muted-foreground hover:text-primary",
                          ].join(" ")}
                          aria-label="Like comment"
                        >
                          <Heart
                            className={`w-3 h-3 ${
                              c.caller_liked ? "fill-current" : ""
                            }`}
                          />
                          {c.like_count.toString()}
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-snug break-words whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}
              {!isFetching && comments.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">
                  No comments yet.
                </p>
              )}
              {!showAll && comments.length > 3 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-primary"
                  onClick={() => setShowAll(true)}
                >
                  View all {comments.length} comments
                </Button>
              ) : showAll && comments.length > 8 ? (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(false)}
                >
                  Show fewer
                </button>
              ) : null}

              <form className="flex gap-2 items-center mt-4" onSubmit={submit}>
                <input
                  type="text"
                  value={draft}
                  placeholder={
                    isAuthenticated
                      ? "Add a supportive note…"
                      : "Sign in to comment"
                  }
                  maxLength={500}
                  onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/35"
                  disabled={!isAuthenticated}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="default"
                  className="bg-primary shrink-0 h-9 w-9"
                  disabled={
                    createComment.isPending ||
                    draft.trim().length === 0 ||
                    !isAuthenticated
                  }
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
              {!isAuthenticated ? (
                <button
                  type="button"
                  className="text-[11px] text-primary underline-offset-2 hover:underline"
                  onClick={login}
                >
                  Sign in to comment as your profile
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
