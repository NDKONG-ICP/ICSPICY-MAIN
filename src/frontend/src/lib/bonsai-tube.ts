/** BonsaiTube embed — single origin for all CookBook how-to videos. */

export const BONSAITUBE_EMBED_ORIGIN =
  "https://f65cr-hqaaa-aaaau-ag3kq-cai.raw.icp0.io";

export function bonsaiTubeEmbedUrl(videoId: string): string {
  return `${BONSAITUBE_EMBED_ORIGIN}/embed/${encodeURIComponent(videoId)}`;
}
