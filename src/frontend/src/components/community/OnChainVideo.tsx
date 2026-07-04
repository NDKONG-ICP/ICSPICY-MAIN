/**
 * OnChainVideo — feed display for community videos stored in the uploads
 * asset canister. Shows the poster with a play overlay; the <video> element
 * only mounts on tap (keeps the feed light). The asset canister serves HTTP
 * range requests, so seeking works natively.
 */
import { Link2, Play } from "lucide-react";
import { useState } from "react";
import { uploadsUrl } from "../../lib/uploads-canister";

export function OnChainVideo({
  videoKey,
  posterKey,
}: {
  videoKey: string;
  posterKey: string | null;
}) {
  const [active, setActive] = useState(false);
  const videoSrc = uploadsUrl(videoKey);
  const posterSrc = posterKey ? uploadsUrl(posterKey) : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black/60">
      {active ? (
        <video
          controls
          playsInline
          autoPlay
          preload="metadata"
          poster={posterSrc ?? undefined}
          src={videoSrc}
          className="w-full max-h-[70vh] bg-black"
        >
          <track kind="captions" />
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group relative block w-full"
          aria-label="Play video"
        >
          {posterSrc ? (
            <img
              src={posterSrc}
              alt="Video preview"
              loading="lazy"
              className="w-full max-h-[70vh] object-cover"
            />
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-zinc-900 to-zinc-800" />
          )}
          <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/15" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full border border-white/25 bg-primary/90 shadow-lg backdrop-blur-sm transition group-hover:scale-110">
              <Play className="ml-0.5 size-6 fill-white text-white" aria-hidden />
            </span>
          </span>
        </button>
      )}
      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-sm pointer-events-none">
        <Link2 className="w-3 h-3" aria-hidden />
        ⛓️ Stored on-chain
      </span>
    </div>
  );
}
