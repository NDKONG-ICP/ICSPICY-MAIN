/** Immersive vector sky for Weather Desk — WMO-driven layered scenes. */
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

export type SkyState =
  | "clear"
  | "partly"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm"
  | "heat";

export function skyStateFromWeather(
  weatherCode: number,
  tempF: number,
): SkyState {
  if (tempF >= 100) return "heat";
  if (weatherCode >= 95) return "storm";
  if (weatherCode >= 61 && weatherCode <= 82) return "rain";
  if (weatherCode >= 51 && weatherCode <= 55) return "drizzle";
  if (weatherCode >= 45 && weatherCode <= 48) return "fog";
  if (weatherCode === 3) return "overcast";
  if (weatherCode === 2) return "partly";
  return "clear";
}

/** Compact day-strip icon (shared with 7-day outlook). */
export function WeatherSkyIcon({
  weatherCode,
  tempF = 80,
  className,
}: {
  weatherCode: number;
  tempF?: number;
  className?: string;
}) {
  const state = skyStateFromWeather(weatherCode, tempF);
  const [top, , bottom] = GRADIENTS[state];
  const gid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill={`url(#${gid})`} />
      {(state === "clear" || state === "partly" || state === "heat") && (
        <circle cx="34" cy="14" r="7" fill="#f4d58d" opacity={0.95} />
      )}
      {(state === "partly" ||
        state === "overcast" ||
        state === "drizzle" ||
        state === "rain" ||
        state === "storm") && (
        <path
          d="M10 30c0-5 4-9 9-9 1.2-3.5 4.5-6 8.5-6 5 0 9 4 9 9h-1c3 0 5.5 2.2 5.5 5S38.5 34 35.5 34H14c-2.8 0-5-2.2-5-5 0-1 .3-2 .9-2.8C10.3 26 10 28 10 30z"
          fill="rgba(236,242,246,0.72)"
        />
      )}
      {(state === "drizzle" || state === "rain" || state === "storm") && (
        <g stroke={state === "storm" ? "#9ec5e8" : "#7eb8d8"} strokeWidth="1.4">
          <line x1="16" y1="36" x2="13" y2="44" />
          <line x1="24" y1="37" x2="21" y2="45" />
          <line x1="32" y1="36" x2="29" y2="44" />
        </g>
      )}
      {state === "storm" && (
        <polyline
          points="28,22 24,30 27,30 22,40"
          fill="none"
          stroke="#e8f0ff"
          strokeWidth="1.6"
        />
      )}
      {state === "fog" && (
        <g fill="rgba(220,226,230,0.45)">
          <rect x="8" y="22" width="32" height="3" rx="1" />
          <rect x="6" y="28" width="36" height="3" rx="1" />
          <rect x="10" y="34" width="28" height="3" rx="1" />
        </g>
      )}
    </svg>
  );
}

const GRADIENTS: Record<SkyState, [string, string, string]> = {
  clear: ["#8ec8e8", "#3a8aa0", "#1e4a58"],
  partly: ["#7ab4d0", "#4a7a8c", "#2a4550"],
  overcast: ["#6a7580", "#3d464f", "#1e242c"],
  fog: ["#8a9096", "#5a6268", "#3a4046"],
  drizzle: ["#4a5a6a", "#2a3848", "#141c28"],
  rain: ["#2e3e52", "#1a2838", "#0c121c"],
  storm: ["#1a2434", "#0e141e", "#060a10"],
  heat: ["#7ab8d0", "#c45a28", "#8a2810"],
};

function CloudBlob({
  cx,
  cy,
  scale = 1,
  opacity = 0.55,
}: {
  cx: number;
  cy: number;
  scale?: number;
  opacity?: number;
}) {
  const s = scale;
  return (
    <path
      d={`M${cx - 90 * s} ${cy}
        c${-20 * s} ${-55 * s} ${40 * s} ${-80 * s} ${85 * s} ${-55 * s}
        c${25 * s} ${-45 * s} ${95 * s} ${-40 * s} ${110 * s} ${10 * s}
        c${45 * s} ${-15 * s} ${85 * s} ${25 * s} ${70 * s} ${55 * s}
        c${30 * s} ${5 * s} ${35 * s} ${45 * s} ${-10 * s} ${55 * s}
        h${-230 * s}
        c${-50 * s} ${-5 * s} ${-55 * s} ${-55 * s} ${-25 * s} ${-65 * s}
        z`}
      fill={`rgba(230,238,244,${opacity})`}
    />
  );
}

export function WeatherSkyStage({
  state,
  className,
}: {
  state: SkyState;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [top, mid, bottom] = GRADIENTS[state];
  const rain = state === "rain" || state === "drizzle" || state === "storm";
  const storm = state === "storm";
  const showSun =
    state === "clear" || state === "partly" || state === "heat";
  const showClouds =
    state === "partly" ||
    state === "overcast" ||
    state === "drizzle" ||
    state === "rain" ||
    state === "storm";
  const rainCount = state === "drizzle" ? 28 : state === "storm" ? 48 : 38;

  return (
    <div
      className={className}
      data-weather-sky={state}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 720"
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="wd-sky-v2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={top} />
            <stop offset="55%" stopColor={mid} />
            <stop offset="100%" stopColor={bottom} />
          </linearGradient>
          <radialGradient id="wd-sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6d0" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#f4d58d" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f4d58d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wd-gulf-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a6078" stopOpacity="0" />
            <stop offset="40%" stopColor="#1a6078" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0a2030" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="wd-heat-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e07a3a" stopOpacity="0" />
            <stop offset="100%" stopColor="#c44a20" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        <rect width="1440" height="720" fill="url(#wd-sky-v2)" />

        {/* Soft gulf horizon atmosphere */}
        <ellipse
          cx="720"
          cy="640"
          rx="900"
          ry="160"
          fill="url(#wd-gulf-band)"
        />

        {showSun && (
          <g>
            <motion.circle
              cx="1180"
              cy="150"
              r="160"
              fill="url(#wd-sun-glow)"
              animate={
                reduce
                  ? undefined
                  : { opacity: [0.55, 0.85, 0.55], scale: [1, 1.04, 1] }
              }
              transition={{
                duration: 5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
            <motion.circle
              cx="1180"
              cy="150"
              r={state === "heat" ? 78 : 64}
              fill="#f4d58d"
              animate={
                reduce
                  ? undefined
                  : { opacity: [0.9, 1, 0.9] }
              }
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
            {state === "clear" &&
              !reduce &&
              [0, 45, 90, 135].map((deg) => (
                <motion.line
                  key={deg}
                  x1="1180"
                  y1="150"
                  x2={1180 + Math.cos((deg * Math.PI) / 180) * 130}
                  y2={150 + Math.sin((deg * Math.PI) / 180) * 130}
                  stroke="#f4d58d"
                  strokeWidth="2"
                  strokeOpacity="0.25"
                  animate={{ strokeOpacity: [0.12, 0.35, 0.12] }}
                  transition={{
                    duration: 4.5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: deg * 0.02,
                  }}
                />
              ))}
          </g>
        )}

        {showClouds && (
          <>
            <motion.g
              animate={reduce ? undefined : { x: [0, 36, 0] }}
              transition={{
                duration: 42,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <CloudBlob cx={280} cy={160} scale={1.15} opacity={state === "overcast" ? 0.5 : 0.4} />
              <CloudBlob cx={620} cy={120} scale={0.9} opacity={0.35} />
            </motion.g>
            <motion.g
              animate={reduce ? undefined : { x: [0, -28, 0] }}
              transition={{
                duration: 34,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <CloudBlob
                cx={980}
                cy={200}
                scale={1.35}
                opacity={
                  state === "overcast" || rain ? 0.62 : 0.42
                }
              />
              <CloudBlob cx={1280} cy={150} scale={0.85} opacity={0.38} />
            </motion.g>
            {(state === "overcast" || rain) && (
              <motion.g
                animate={reduce ? undefined : { opacity: [0.45, 0.65, 0.45] }}
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <CloudBlob cx={480} cy={240} scale={1.5} opacity={0.4} />
                <CloudBlob cx={860} cy={280} scale={1.2} opacity={0.35} />
              </motion.g>
            )}
          </>
        )}

        {state === "fog" && (
          <motion.g
            animate={reduce ? undefined : { x: [0, 50, 0] }}
            transition={{
              duration: 22,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            {[200, 280, 360, 440, 520].map((y, i) => (
              <rect
                key={y}
                y={y}
                width="1600"
                x={-80 + i * 12}
                height={28 + (i % 3) * 8}
                fill="rgba(210,218,222,0.28)"
                rx="8"
              />
            ))}
          </motion.g>
        )}

        {rain &&
          Array.from({ length: rainCount }).map((_, i) => {
            const x = 20 + ((i * 97) % 1400);
            const len = state === "drizzle" ? 55 : state === "storm" ? 110 : 85;
            return (
              <motion.line
                key={i}
                x1={x}
                y1={40}
                x2={x - 18}
                y2={40 + len}
                stroke={storm ? "#9ec5e8" : "#7eb8d8"}
                strokeWidth={state === "drizzle" ? 1.1 : 1.8}
                strokeLinecap="round"
                opacity={0.5}
                animate={
                  reduce
                    ? undefined
                    : {
                        y: [0, 200],
                        opacity: [0, 0.65, 0],
                      }
                }
                transition={{
                  duration: state === "drizzle" ? 2.1 : storm ? 0.85 : 1.15,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: (i % 12) * 0.09,
                  ease: "linear",
                }}
              />
            );
          })}

        {storm && !reduce && (
          <>
            <motion.rect
              width="1440"
              height="720"
              fill="#dce8ff"
              animate={{ opacity: [0, 0.22, 0, 0, 0.12, 0] }}
              transition={{
                duration: 6,
                repeat: Number.POSITIVE_INFINITY,
                times: [0, 0.04, 0.08, 0.65, 0.7, 1],
              }}
            />
            <motion.polyline
              points="760,60 710,190 745,190 690,360"
              fill="none"
              stroke="#e8f0ff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ opacity: [0, 1, 0, 0, 0.8, 0] }}
              transition={{
                duration: 6,
                repeat: Number.POSITIVE_INFINITY,
                times: [0, 0.05, 0.1, 0.68, 0.73, 1],
              }}
            />
            {[0, 1, 2].map((i) => (
              <motion.line
                key={i}
                x1={100 + i * 400}
                y1={320}
                x2={220 + i * 400}
                y2={300}
                stroke="rgba(200,220,240,0.35)"
                strokeWidth="2"
                animate={{ x: [0, 40, 0], opacity: [0.15, 0.4, 0.15] }}
                transition={{
                  duration: 2.2,
                  delay: i * 0.3,
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
            ))}
          </>
        )}

        {state === "heat" && (
          <motion.rect
            width="1440"
            height="720"
            fill="url(#wd-heat-wash)"
            animate={
              reduce
                ? { opacity: 0.55 }
                : { opacity: [0.4, 0.7, 0.4], scaleY: [1, 1.02, 1] }
            }
            style={{ transformOrigin: "center bottom" }}
            transition={{
              duration: 3.2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        )}
      </svg>
    </div>
  );
}
