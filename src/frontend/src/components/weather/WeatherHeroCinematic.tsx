/**
 * Full-bleed cinematic hero — SWFL Grok clips keyed to WMO sky state.
 * Falls back to vector WeatherSkyStage when reduced-motion or video error.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  heroPosterForState,
  heroVideoForState,
  SKY_STATE_LABEL,
} from "../../lib/weather-heroes";
import {
  WeatherSkyStage,
  type SkyState,
} from "./WeatherSkyStage";

export function WeatherHeroCinematic({
  state,
  className,
}: {
  state: SkyState;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState<Partial<Record<SkyState, boolean>>>({});
  // Only reveal the video once it is actually rendering frames. Slow mobile
  // loads (7–20MB clips) and iOS Low Power Mode (autoplay blocked) otherwise
  // leave a black hero — the vector stage below stays visible until then.
  const [playing, setPlaying] = useState<Partial<Record<SkyState, boolean>>>({});
  const [active, setActive] = useState(state);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setActive(state);
  }, [state]);

  const useVideo = !reduce && !failed[active];
  const src = heroVideoForState(active);
  const poster = heroPosterForState(active);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !useVideo) return;
    el.load();
    void el.play().catch(() => {
      /* autoplay may be blocked — vector stage stays visible */
    });
  }, [src, useVideo]);

  const videoVisible = Boolean(playing[active]);

  return (
    <div
      className={className}
      data-weather-hero="cinematic"
      data-sky-state={active}
      aria-hidden
    >
      {/* Vector sky always mounted as the base layer — never a blank hero. */}
      <WeatherSkyStage state={active} className="absolute inset-0" />
      <AnimatePresence mode="sync">
        {useVideo && (
          <motion.video
            key={src}
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            src={src}
            poster={poster}
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
            initial={{ opacity: 0 }}
            animate={{ opacity: videoVisible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
            onPlaying={() =>
              setPlaying((prev) => ({ ...prev, [active]: true }))
            }
            onError={() =>
              setFailed((prev) => ({ ...prev, [active]: true }))
            }
          />
        )}
      </AnimatePresence>

      {/* Film grain + vignette — brand atmosphere without covering the cut */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.45)_100%)]" />

      <span className="sr-only">{SKY_STATE_LABEL[active]} cinematic background</span>
    </div>
  );
}
