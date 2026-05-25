import type { CommentPublic, PostPublic } from "../declarations/backend.did";

export function timeAgoNanos(ts: bigint): string {
  const diff = Date.now() - Number(ts) / 1_000_000;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(Number(ts) / 1_000_000).toLocaleDateString();
}

/** Backend edit window matches `community.mo` EDIT_WINDOW_NS (15 min). */
export function isPostEditableWindow(
  createdAtNanos: bigint,
  windowMs = 15 * 60 * 1000,
): boolean {
  return Date.now() - Number(createdAtNanos) / 1_000_000 < windowMs;
}

export function postImagePaths(post: PostPublic): string[] {
  const keys = [...post.image_keys];
  if (post.image_key.length === 1) {
    const k = post.image_key[0]!;
    if (!keys.includes(k)) keys.unshift(k);
  }
  return keys.filter((k) => k.length > 0);
}

export function getPostAuthorPrincipalText(
  post: PostPublic,
): string | undefined {
  const p = post.author_principal;
  return p.length === 1 ? p[0]!.toText() : undefined;
}

export function getPostAuthorDisplayName(post: PostPublic): string {
  if (post.is_anonymous) return "Anonymous";
  if (post.author_username.length === 1) return `@${post.author_username[0]}`;
  const t = post.author_text;
  return t.length > 12 ? `${t.slice(0, 6)}…${t.slice(-4)}` : t;
}

export function getPostAuthorInitial(post: PostPublic): string {
  if (post.is_anonymous) return "🌶️";
  if (post.author_username.length === 1) {
    return post.author_username[0]!.slice(0, 1).toUpperCase();
  }
  return post.author_text.slice(0, 1).toUpperCase();
}

export function getCommentAuthorInitial(c: CommentPublic): string {
  if (c.author_username.length === 1) {
    return c.author_username[0]!.slice(0, 1).toUpperCase();
  }
  return c.author.toText().slice(0, 1).toUpperCase();
}

export function getCommentAuthorDisplay(c: CommentPublic): string {
  if (c.is_anonymous) return "Anonymous";
  if (c.author_username.length === 1) return `@${c.author_username[0]}`;
  const t = c.author.toText();
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

export function communitySharePostUrl(postId: bigint): string {
  return `https://www.icspicy.app/community/post/${postId.toString()}`;
}
