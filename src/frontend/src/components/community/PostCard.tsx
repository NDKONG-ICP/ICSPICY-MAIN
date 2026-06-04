import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import {
  Heart,
  Image as ImageLucide,
  Leaf,
  Link2,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { PostPublic } from "../../declarations/backend.did";
import { useAuth } from "../../hooks/useAuth";
import {
  useDeletePost,
  useEditPost,
  useToggleLikePost,
} from "../../hooks/usePost";
import {
  getPostAuthorDisplayName,
  getPostAuthorInitial,
  getPostAuthorPrincipalText,
  isPostEditableWindow,
  postImagePaths,
  timeAgoNanos,
} from "../../lib/community-utils";
import { CommentSection } from "./CommentSection";
import { CommunityAvatar } from "./CommunityAvatar";
import { FollowButton } from "./FollowButton";
import { ImageGallery } from "./ImageGallery";
import { ShareMenu } from "./ShareMenu";
import { TipDialog } from "./TipDialog";

export function PostCard({
  post,
  initialCommentsOpen,
}: {
  post: PostPublic;
  initialCommentsOpen?: boolean;
}) {
  const { principal, isAuthenticated, login } = useAuth();

  const like = useToggleLikePost();
  const editPost = useEditPost();
  const deletePost = useDeletePost();

  const authorPidText = getPostAuthorPrincipalText(post);
  const authorPrincipal =
    authorPidText !== undefined ? Principal.fromText(authorPidText) : undefined;

  const isOwnPost =
    !post.is_anonymous &&
    authorPidText !== undefined &&
    principal?.toText() === authorPidText;

  const canEditDelete =
    isOwnPost && isPostEditableWindow(post.created_at) && !post.is_anonymous;

  const recipientText = authorPidText;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const imgs = postImagePaths(post);
  const plantId = post.plant_id.length === 1 ? post.plant_id[0]! : undefined;
  const nftTok =
    post.nft_token_id.length === 1 ? post.nft_token_id[0]! : undefined;

  const toggleLikeHandler = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    like.mutate(
      { postId: post.id, callerLiked: post.caller_liked },
      { onError: () => toast.error("Could not toggle like.") },
    );
  };

  const handleSaveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === post.content) {
      setEditing(false);
      return;
    }
    editPost.mutate(
      { postId: post.id, newContent: trimmed },
      {
        onSuccess: (ok) => {
          if (ok === false) {
            toast.error("Editing window expired (15 min).");
          } else {
            toast.success("Post updated.");
            setEditing(false);
          }
        },
        onError: () => toast.error("Unable to edit post."),
      },
    );
  };

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        toast.success("Post removed.");
        setConfirmDelete(false);
      },
      onError: () => toast.error("Delete failed."),
    });
  };

  return (
    <motion.article
      layout
      className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-subtle hover:border-primary/25 transition-smooth relative"
      data-ocid="community-post-card"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          {authorPidText && !post.is_anonymous ? (
            <CommunityAvatar
              principalText={authorPidText}
              username={
                post.author_username.length === 1
                  ? post.author_username[0]
                  : undefined
              }
              size="md"
            />
          ) : (
            <CommunityAvatar principalText="anonymous" username="?" size="md" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {authorPidText && !post.is_anonymous ? (
                <Link
                  to="/profile/$principal"
                  params={{ principal: authorPidText }}
                  className="text-sm font-semibold text-foreground truncate hover:text-primary transition-smooth"
                >
                  {getPostAuthorDisplayName(post)}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-foreground truncate">
                  {getPostAuthorDisplayName(post)}
                </p>
              )}
              {post.is_anonymous ? (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 border-border text-muted-foreground"
                >
                  anon
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span>{timeAgoNanos(post.created_at)}</span>
              {plantId !== undefined ? (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  plant linked
                </Badge>
              ) : null}
              {nftTok !== undefined ? (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  NFT linked
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          {!isOwnPost && authorPrincipal ? (
            <FollowButton target={authorPrincipal} className="h-8" />
          ) : null}
          {canEditDelete && (
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                onClick={() => {
                  setDraft(post.content);
                  setEditing(true);
                }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 space-y-2"
          >
            <p className="text-xs text-foreground font-medium">
              Delete this moment?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs"
                disabled={deletePost.isPending}
                type="button"
                onClick={handleDelete}
              >
                {deletePost.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-border"
                type="button"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editing ? (
        <div className="space-y-2 mb-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            maxLength={2000}
            className="text-sm border-border bg-muted/30 resize-none min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              type="button"
              className="h-8 text-xs"
              disabled={editPost.isPending}
              onClick={handleSaveEdit}
            >
              {editPost.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Save
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              className="h-8 text-xs"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground leading-relaxed mb-4 whitespace-pre-wrap break-words">
          {post.content}
        </p>
      )}

      {(plantId !== undefined || nftTok !== undefined) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {plantId !== undefined ? (
            <Link
              to="/plant/$plantId"
              params={{ plantId: plantId.toString() }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/20 text-[11px] hover:border-primary/40 transition-smooth"
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open plant #{plantId.toString()}</span>
            </Link>
          ) : null}
          {nftTok !== undefined ? (
            <Link
              to="/nft/$tokenId"
              params={{ tokenId: nftTok.toString() }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/20 text-[11px] hover:border-primary/40 transition-smooth"
            >
              <ImageLucide className="w-3.5 h-3.5 text-orange-400" />
              View NFT #{nftTok.toString()}
            </Link>
          ) : null}
        </div>
      )}

      {imgs.length > 0 ? (
        <div className="mb-4">
          <ImageGallery
            paths={imgs}
            altPrefix={`Post ${post.id.toString()} image`}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 pt-4 border-t border-border/70 items-center text-xs">
        <button
          type="button"
          className={`flex items-center gap-1.5 font-semibold transition-smooth group ${
            post.caller_liked
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          }`}
          onClick={toggleLikeHandler}
          data-ocid="community-post-like"
        >
          <Heart
            className={`w-4 h-4 ${
              post.caller_liked ? "fill-current" : ""
            } group-hover:scale-105 transition-smooth`}
          />
          {post.like_count.toString()}
        </button>

        <CommentSection
          postId={post.id}
          previewCount={post.comment_count}
          initialOpen={initialCommentsOpen}
        />

        <TipDialog
          postId={post.id}
          recipientPrincipalText={recipientText}
          triggerLabel="Tip"
        />

        <div className="ml-auto shrink-0">
          <ShareMenu postId={post.id} previewText={post.content} />
        </div>
      </div>

      {post.tip_count > 0n ? (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Link2 className="w-3 h-3" /> {post.tip_count.toString()} on-chain tip
          {post.tip_count === 1n ? "" : "s"} anchored
        </p>
      ) : null}
    </motion.article>
  );
}
