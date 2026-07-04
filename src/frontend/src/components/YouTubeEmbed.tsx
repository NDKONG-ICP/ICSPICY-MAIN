/**
 * YouTubeEmbed — lazy, privacy-enhanced YouTube player.
 *
 * Renders only the video thumbnail with a branded play button; the iframe
 * (and all YouTube JS) loads on click. Keeps LCP/CLS clean on pages where
 * the video is embedded (Core Web Vitals).
 */
import { Play } from "lucide-react";
import { useState } from "react";
import { youTubeEmbedUrl, youTubeThumbnailUrl } from "../lib/youtube";

export function YouTubeEmbed({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 shadow-lg backdrop-blur-sm"
      data-ocid="youtube-embed"
    >
      {playing ? (
        <iframe
          src={youTubeEmbedUrl(videoId)}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Play video: ${title}`}
        >
          <img
            src={youTubeThumbnailUrl(videoId)}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-primary/90 shadow-[0_0_30px_-4px_rgba(239,68,68,0.7)] backdrop-blur-sm transition group-hover:scale-110">
              <Play className="ml-1 size-7 fill-white text-white" aria-hidden />
            </span>
          </span>
          <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
            ▶ Watch tutorial
          </span>
        </button>
      )}
    </div>
  );
}
