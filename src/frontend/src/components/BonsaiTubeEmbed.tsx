/**
 * BonsaiTubeEmbed — lazy-loaded responsive how-to player for CookBook recipes.
 *
 * Renders a branded poster + play CTA; the iframe loads only after tap so
 * recipe pages stay fast and the Bonsai canister is not hit until playback.
 */
import { Play } from "lucide-react";
import { useState } from "react";
import { bonsaiTubeEmbedUrl } from "../lib/bonsai-tube";

export function BonsaiTubeEmbed({
  videoId,
  title,
  posterUrl,
}: {
  videoId: string;
  title: string;
  /** Optional recipe hero image; falls back to gradient poster. */
  posterUrl?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const embedSrc = bonsaiTubeEmbedUrl(videoId);

  return (
    <div
      className="relative mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-orange-500/25 bg-zinc-950/80 shadow-[0_0_40px_-8px_rgba(249,115,22,0.45)] backdrop-blur-sm"
      data-ocid="bonsai-tube-embed"
    >
      {playing ? (
        <iframe
          src={embedSrc}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full text-left"
          aria-label={`Watch how-to: ${title}`}
        >
          {posterUrl ? (
            <img
              src={posterUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div
              className="h-full w-full bg-gradient-to-br from-zinc-950 via-orange-950/40 to-zinc-900"
              aria-hidden
            />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-orange-900/10" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
            <span className="flex size-16 items-center justify-center rounded-full border border-orange-400/30 bg-primary/90 shadow-[0_0_32px_-4px_rgba(249,115,22,0.85)] backdrop-blur-sm transition group-hover:scale-110 group-active:scale-95">
              <Play
                className="ml-1 size-7 fill-white text-white"
                aria-hidden
              />
            </span>
            <span className="rounded-full border border-orange-400/25 bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-100/95 backdrop-blur-sm">
              ▶ Watch how-to
            </span>
            <span className="text-[10px] font-medium tracking-wide text-orange-200/70">
              Watch on BonsaiTube
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
