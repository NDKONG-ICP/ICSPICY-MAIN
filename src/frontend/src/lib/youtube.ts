/** YouTube URL parsing + privacy-enhanced embed helpers. */

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract the 11-char video ID from any common YouTube URL shape:
 * watch?v=, youtu.be/, shorts/, embed/, live/. Returns null if the URL
 * isn't recognizably YouTube.
 */
export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, "");

  let candidate: string | null = null;
  if (host === "youtu.be") {
    candidate = parsed.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.pathname === "/watch") {
      candidate = parsed.searchParams.get("v");
    } else if (
      parts.length >= 2 &&
      ["shorts", "embed", "live", "v"].includes(parts[0]!)
    ) {
      candidate = parts[1] ?? null;
    }
  }
  return candidate && ID_PATTERN.test(candidate) ? candidate : null;
}

/** Privacy-enhanced embed URL (no cookies until playback). */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}

/** High-quality default thumbnail. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
