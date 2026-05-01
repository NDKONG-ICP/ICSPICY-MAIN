import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Facebook,
  Heart,
  ImageIcon,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
  useCommentsByPost,
  useCreateComment,
  useCreatePost,
  useDeletePost,
  useEditPost,
  useFollowUser,
  useLikePost,
  usePosts,
} from "../hooks/useCommunity";
import type { Comment, Post, PostId } from "../types/index";
import { SOCIAL_LINKS } from "../types/index";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: bigint): string {
  const diff = Date.now() - Number(ts) / 1_000_000;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(Number(ts) / 1_000_000).toLocaleDateString();
}

function getAuthorDisplay(post: Post): string {
  if (post.is_anonymous) return "🌶 Anonymous";
  if (post.author_username) return `@${post.author_username}`;
  return post.author_text.length > 12
    ? `${post.author_text.slice(0, 6)}…${post.author_text.slice(-4)}`
    : post.author_text;
}

function getAuthorInitial(post: Post): string {
  if (post.is_anonymous) return "🌶";
  if (post.author_username)
    return post.author_username.slice(0, 1).toUpperCase();
  return post.author_text.slice(0, 1).toUpperCase();
}

function getCommentAuthorDisplay(comment: Comment): string {
  if (comment.author_username) return `@${comment.author_username}`;
  const t = comment.author.toText();
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function getCommentInitial(comment: Comment): string {
  if (comment.author_username)
    return comment.author_username.slice(0, 1).toUpperCase();
  return comment.author.toText().slice(0, 1).toUpperCase();
}

// ─── SharePanel ──────────────────────────────────────────────────────────────

function SharePanel({
  postId,
  content,
  onClose,
}: {
  postId: PostId;
  content: string;
  onClose: () => void;
}) {
  const postUrl = `${window.location.origin}/community?post=${postId.toString()}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedText = encodeURIComponent(
    `${content.slice(0, 100)}… via @icspicyrwa`,
  );

  const shareTargets = [
    {
      label: "Facebook",
      icon: <Facebook className="w-4 h-4" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      colorClass: "text-blue-400",
    },
    {
      label: "X / Twitter",
      icon: <X className="w-4 h-4" />,
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      colorClass: "text-foreground",
    },
    {
      label: "Instagram",
      icon: <ImageIcon className="w-4 h-4" />,
      url: SOCIAL_LINKS.instagram,
      colorClass: "text-pink-400",
    },
    {
      label: "TikTok",
      icon: <Send className="w-4 h-4" />,
      url: SOCIAL_LINKS.tiktok,
      colorClass: "text-cyan-400",
    },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(postUrl).then(() => {
      toast.success("Link copied!");
      onClose();
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      className="absolute right-0 bottom-10 z-20 w-52 rounded-xl bg-card border border-border shadow-elevated p-2"
      data-ocid="share-panel"
    >
      <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
        Share this post
      </p>
      <Separator className="my-1" />
      {shareTargets.map(({ label, icon, url, colorClass }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm hover:bg-muted/40 transition-smooth ${colorClass}`}
          onClick={onClose}
          data-ocid={`share-${label.toLowerCase().replace(/[\s/]+/g, "-")}`}
        >
          {icon}
          {label}
        </a>
      ))}
      <Separator className="my-1" />
      <button
        type="button"
        onClick={copyLink}
        className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 w-full transition-smooth"
        data-ocid="share-copy-link"
      >
        <Copy className="w-4 h-4" />
        Copy link
      </button>
    </motion.div>
  );
}

// ─── CommentThread ────────────────────────────────────────────────────────────

function CommentThread({
  postId,
  commentCount,
}: {
  postId: PostId;
  commentCount: bigint;
}) {
  const [open, setOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { isAuthenticated, login } = useAuth();
  const { data: comments, isLoading } = useCommentsByPost(
    open ? postId : undefined,
  );
  const createComment = useCreateComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await createComment.mutateAsync({
        post_id: postId,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment posted!");
    } catch {
      toast.error("Failed to post comment.");
    }
  };

  return (
    <div data-ocid="comment-thread">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth"
        data-ocid="comment-toggle-btn"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{commentCount.toString()}</span>
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pl-4 border-l-2 border-border space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </div>
              ) : comments && comments.length > 0 ? (
                comments.map((c: Comment) => (
                  <div key={c.id.toString()} className="flex gap-2.5">
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarFallback className="bg-secondary text-foreground text-xs font-medium">
                        {getCommentInitial(c)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {getCommentAuthorDisplay(c)} · {timeAgo(c.created_at)}
                      </p>
                      <p className="text-sm text-foreground mt-0.5 break-words">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No comments yet. Be the first!
                </p>
              )}

              {isAuthenticated ? (
                <form
                  onSubmit={handleSubmit}
                  className="flex gap-2 mt-3"
                  data-ocid="comment-form"
                >
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment…"
                    className="flex-1 min-w-0 rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-smooth"
                    maxLength={512}
                    data-ocid="comment-input"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-primary shrink-0"
                    disabled={createComment.isPending || !newComment.trim()}
                    data-ocid="comment-submit-btn"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={login}
                  className="text-xs text-primary hover:underline"
                  data-ocid="comment-login-btn"
                >
                  Sign in to comment
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

/** Returns true if the post is still within the 48-hour editable window. */
function isEditable(createdAt: bigint): boolean {
  return Date.now() - Number(createdAt) / 1_000_000 < 48 * 60 * 60 * 1000;
}

function PostCard({ post }: { post: Post }) {
  const { isAuthenticated, login, principal } = useAuth();
  const likePost = useLikePost();
  const followUser = useFollowUser();
  const editPost = useEditPost();
  const deletePost = useDeletePost();

  const [showShare, setShowShare] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwnPost =
    !post.is_anonymous &&
    post.author_principal &&
    principal?.toText() === post.author_principal.toText();

  const canEditDelete = isOwnPost && isEditable(post.created_at);

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to like posts.");
      login();
      return;
    }
    likePost.mutate({ postId: post.id, liked: post.caller_liked });
  };

  const handleFollow = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    if (!post.author_principal) return;
    followUser.mutate(
      { target: post.author_principal, following: false },
      {
        onSuccess: () => toast.success("Now following!"),
        onError: () => toast.error("Failed to follow."),
      },
    );
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === post.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editPost.mutateAsync({ postId: post.id, newContent: trimmed });
      toast.success("Post updated.");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update post.");
    }
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Post deleted.");
      setShowDeleteConfirm(false);
    } catch {
      toast.error("Failed to delete post.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl bg-card border border-border p-5 shadow-subtle hover:border-primary/30 transition-smooth relative"
      data-ocid="post-card"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 shrink-0 ring-2 ring-border">
            <AvatarFallback
              className={
                post.is_anonymous
                  ? "bg-muted text-base"
                  : "bg-primary/15 text-primary font-bold text-sm"
              }
            >
              {getAuthorInitial(post)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">
                {getAuthorDisplay(post)}
              </p>
              {post.is_anonymous && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground"
                >
                  anon
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeAgo(post.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Edit / Delete — only visible to author within 48h */}
          {canEditDelete && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditContent(post.content);
                  setIsEditing(true);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-smooth"
                aria-label="Edit post"
                data-ocid="post-edit-btn"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-smooth"
                aria-label="Delete post"
                data-ocid="post-delete-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}

          {post.author_principal &&
            !post.is_anonymous &&
            !isOwnPost &&
            isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                className="border-border h-7 text-xs hover:border-primary/50 hover:text-primary"
                onClick={handleFollow}
                disabled={followUser.isPending}
                data-ocid="post-follow-btn"
              >
                <Users className="w-3 h-3 mr-1" />
                Follow
              </Button>
            )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="mb-4 rounded-xl bg-destructive/8 border border-destructive/30 p-4 space-y-3"
            data-ocid="post-delete-dialog"
          >
            <p className="text-sm text-foreground font-medium">
              Delete this post?
            </p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deletePost.isPending}
                className="h-7 text-xs"
                data-ocid="post-delete-confirm-btn"
              >
                {deletePost.isPending ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-7 text-xs border-border"
                data-ocid="post-delete-cancel-btn"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content — inline editor or read view */}
      {isEditing ? (
        <div className="mb-4 space-y-2" data-ocid="post-edit-form">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="resize-none text-sm min-h-[90px]"
            maxLength={1024}
            autoFocus
            data-ocid="post-edit-input"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs bg-primary hover:bg-primary/90"
              onClick={handleSaveEdit}
              disabled={editPost.isPending || !editContent.trim()}
              data-ocid="post-edit-save-btn"
            >
              {editPost.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-border"
              onClick={handleCancelEdit}
              data-ocid="post-edit-cancel-btn"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground leading-relaxed mb-4 break-words">
          {post.content}
        </p>
      )}

      {/* Optional image */}
      {post.image_key && (
        <div className="mb-4 rounded-xl overflow-hidden border border-border bg-muted/20">
          <img
            src={post.image_key}
            alt="Attached media"
            className="w-full object-cover max-h-80"
            loading="lazy"
          />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-5 relative pt-3 border-t border-border/60">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          className={[
            "flex items-center gap-1.5 text-xs font-medium transition-smooth group",
            post.caller_liked
              ? "text-primary"
              : "text-muted-foreground hover:text-primary",
          ].join(" ")}
          aria-label={post.caller_liked ? "Unlike post" : "Like post"}
          data-ocid="post-like-btn"
        >
          <Heart
            className={`w-4 h-4 transition-smooth ${
              post.caller_liked
                ? "fill-current scale-110"
                : "group-hover:scale-110"
            }`}
          />
          {post.like_count.toString()}
        </button>

        {/* Comments */}
        <CommentThread postId={post.id} commentCount={post.comment_count} />

        {/* Share */}
        <button
          type="button"
          onClick={() => setShowShare((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth ml-auto"
          aria-label="Share post"
          data-ocid="post-share-btn"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        <AnimatePresence>
          {showShare && (
            <SharePanel
              postId={post.id}
              content={post.content}
              onClose={() => setShowShare(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── CreatePostForm ───────────────────────────────────────────────────────────

function CreatePostForm({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB.");
      return;
    }
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => setImageDataUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageDataUrl(null);
      setImageName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await createPost.mutateAsync({
        content: content.trim(),
        anonymous,
        image_key: imageDataUrl ?? undefined,
      });
      toast.success("Post published! 🌶️");
      setContent("");
      setAnonymous(false);
      setImageDataUrl(null);
      setImageName("");
      onClose();
    } catch {
      toast.error("Failed to publish post.");
    }
  };

  const charCount = content.length;
  const maxChars = 1024;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-card border border-primary/30 p-6 space-y-4 shadow-elevated"
        data-ocid="create-post-form"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">
            New Post
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-smooth rounded-md p-1"
            aria-label="Close form"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your grow journey, tips, chili harvest results, or ask the community…"
            className="resize-none text-sm min-h-[110px] pr-12"
            rows={4}
            maxLength={maxChars}
            data-ocid="post-content-input"
          />
          <span
            className={`absolute bottom-2.5 right-3 text-[10px] tabular-nums ${
              charCount > maxChars * 0.9
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {charCount}/{maxChars}
          </span>
        </div>

        {imageDataUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border max-h-40">
            <img
              src={imageDataUrl}
              alt="Preview"
              className="w-full object-cover max-h-40"
            />
            <button
              type="button"
              onClick={() => {
                setImageDataUrl(null);
                setImageName("");
              }}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 text-foreground hover:text-primary transition-smooth"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth"
              aria-label="Attach a photo"
            >
              <ImageIcon className="w-4 h-4" />
              {imageName ? `${imageName.slice(0, 16)}…` : "Add photo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-ocid="post-image-input"
            />

            <label
              className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-smooth"
              htmlFor="post-anon"
            >
              <input
                id="post-anon"
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded border-border accent-primary"
                data-ocid="post-anonymous-checkbox"
              />
              Post anonymously
            </label>
          </div>

          <Button
            type="submit"
            size="sm"
            className="bg-primary hover:bg-primary/90"
            disabled={createPost.isPending || !content.trim()}
            data-ocid="post-submit-btn"
          >
            {createPost.isPending ? "Posting…" : "Publish 🌶️"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

// ─── FeedSkeleton ─────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-4" data-ocid="community-loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-card border border-border p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { isAuthenticated, login } = useAuth();
  // CRITICAL (TanStack Query v5): Use isPending (not isLoading) as the loading
  // guard. isLoading = isPending && isFetching. In the window between the query
  // becoming enabled and the first fetch completing, isLoading can briefly be
  // false while data is still undefined — causing a premature empty-state render
  // and making it appear as if the user's post was deleted.
  // isPending stays true until the FIRST successful response arrives.
  const { data: posts, isPending: isPostsPending } = usePosts();
  const [showForm, setShowForm] = useState(false);

  const sortedPosts = posts
    ? [...posts].sort((a, b) => Number(b.created_at - a.created_at))
    : [];

  return (
    <div data-ocid="community-page" className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground mb-1">
              🌶️ IC SPICY <span className="text-fire">Community</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Connect with fellow pepper enthusiasts — share grows, tips, and
              harvests.
            </p>
          </div>

          {isAuthenticated ? (
            <Button
              size="sm"
              onClick={() => setShowForm((v) => !v)}
              className="bg-primary hover:bg-primary/90 shrink-0"
              data-ocid="community-new-post-btn"
            >
              {showForm ? (
                <X className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {showForm ? "Cancel" : "New Post"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={login}
              className="border-primary/40 text-primary hover:bg-primary/10 shrink-0"
              data-ocid="community-login-btn"
            >
              Sign in to post
            </Button>
          )}
        </div>

        {/* Auth nudge banner when not authenticated */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
            data-ocid="community-auth-banner"
          >
            <p className="text-sm text-foreground">
              <span className="text-primary font-medium">
                Join the conversation.
              </span>{" "}
              Sign in with Internet Identity to post, like, and comment.
            </p>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 shrink-0"
              onClick={login}
            >
              Sign in
            </Button>
          </motion.div>
        )}
      </div>

      {/* Create post form */}
      <AnimatePresence>
        {showForm && (
          <div className="mb-6">
            <CreatePostForm onClose={() => setShowForm(false)} />
          </div>
        )}
      </AnimatePresence>

      {/* Feed */}
      {isPostsPending ? (
        <FeedSkeleton />
      ) : sortedPosts.length > 0 ? (
        <div className="space-y-4" data-ocid="post-list">
          {sortedPosts.map((p, i) => (
            <motion.div
              key={p.id.toString()}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              <PostCard post={p} />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
          data-ocid="community-empty"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6 shadow-subtle">
            <span className="text-4xl">🌶️</span>
          </div>
          <h3 className="font-display font-semibold text-foreground text-xl mb-2">
            Be the first to post!
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs leading-relaxed">
            Share your chili growing journey, rare plant discoveries, or farming
            tips with the IC SPICY community.
          </p>
          {isAuthenticated ? (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowForm(true)}
              data-ocid="community-empty-cta"
            >
              <Plus className="w-4 h-4 mr-1" />
              Start the conversation
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary"
              onClick={login}
              data-ocid="community-empty-login"
            >
              Sign in to post
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
