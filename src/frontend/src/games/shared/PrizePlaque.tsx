import { useMemo } from "react";
import { formatShu } from "../config";
import { ARCADE_ASSETS, ARCADE_BULB_CHASE } from "./arcade-assets";
import { getArcadeEffectsTier, type ArcadeEffectsTier } from "./arcade-device-tier";
import { isPlaqueDebug, PRIZE_PLAQUE_MAP } from "./prize-plaque-map";
import "./arcade-theme.css";
import "./prize-plaque.css";

/** Bulb positions along prize-plaque frame (10 per side). */
const PLAQUE_BULBS_LEFT = [
  { x: 8, y: 18, r: 2.2 },
  { x: 7.8, y: 28, r: 2.1 },
  { x: 8, y: 38, r: 2.2 },
  { x: 7.9, y: 48, r: 2.1 },
  { x: 8, y: 58, r: 2.2 },
  { x: 7.8, y: 68, r: 2.1 },
  { x: 8, y: 78, r: 2.2 },
  { x: 7.9, y: 88, r: 2.1 },
] as const;

const PLAQUE_BULBS_RIGHT = PLAQUE_BULBS_LEFT.map((b) => ({
  x: 100 - b.x,
  y: b.y,
  r: b.r,
}));

function PlaqueBulbs({ effects }: { effects: ArcadeEffectsTier }) {
  if (effects === "static") return null;
  const { stepSec, cycleSec } = ARCADE_BULB_CHASE;
  const bulbs = [...PLAQUE_BULBS_LEFT, ...PLAQUE_BULBS_RIGHT];
  return (
    <div className="arcade-bulb-field" aria-hidden>
      {bulbs.map((b, i) => (
        <span
          key={i}
          className="arcade-bulb-glow"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.r * 2}%`,
            height: `${b.r * 2}%`,
            ["--bulb-delay" as string]: `${(i % 8) * stepSec}s`,
            ["--bulb-cycle" as string]: `${cycleSec}s`,
          }}
        />
      ))}
    </div>
  );
}

function PlaqueDebugOverlay() {
  const panel = PRIZE_PLAQUE_MAP.panel;
  return (
    <div className="plaque-debug" aria-hidden>
      <span
        className="plaque-debug__panel"
        style={{
          left: `${panel.left}%`,
          top: `${panel.top}%`,
          width: `${panel.width}%`,
          height: `${panel.height}%`,
        }}
      />
    </div>
  );
}

export function PrizePlaque({
  score,
  label = "Final Score",
  isNewBest = false,
  celebrate = true,
  displayValue,
  className = "",
}: {
  score: bigint | number;
  label?: string;
  isNewBest?: boolean;
  celebrate?: boolean;
  displayValue?: string;
  className?: string;
}) {
  const effects = useMemo(() => getArcadeEffectsTier(), []);
  const showDebug = useMemo(() => isPlaqueDebug(), []);
  const panel = PRIZE_PLAQUE_MAP.panel;

  return (
    <div className={["arcade-prize-plaque", className].join(" ")}>
      {isNewBest && (
        <p className="arcade-new-best-banner arcade-prize-plaque__banner">
          New Personal Best
        </p>
      )}
      <div
        className="arcade-prize-plaque__frame"
        style={{
          aspectRatio: `${PRIZE_PLAQUE_MAP.intrinsicWidth} / ${PRIZE_PLAQUE_MAP.intrinsicHeight}`,
        }}
      >
        <img
          src={ARCADE_ASSETS.prizePlaque}
          alt="Carnival prize plaque"
          className="arcade-prize-plaque__photo"
          width={PRIZE_PLAQUE_MAP.intrinsicWidth}
          height={PRIZE_PLAQUE_MAP.intrinsicHeight}
          decoding="async"
        />
        {celebrate && <PlaqueBulbs effects={effects} />}
        {showDebug && <PlaqueDebugOverlay />}
        <div
          className="arcade-prize-plaque__panel arcade-painted-text"
          style={{
            left: `${panel.left}%`,
            top: `${panel.top}%`,
            width: `${panel.width}%`,
            height: `${panel.height}%`,
          }}
        >
          <span className="arcade-prize-plaque__label">{label}</span>
          <span className="arcade-prize-plaque__value">
            {displayValue ?? formatShu(score)}{" "}
            {!displayValue && <span aria-hidden>🔥</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
