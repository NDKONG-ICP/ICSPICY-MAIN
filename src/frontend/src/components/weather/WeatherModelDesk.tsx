/**
 * Model desk — four-model comparison chart (precip or wind gusts), model
 * agreement meter, GFS ensemble plume with P10–P90 spread band + median,
 * and a per-model daily table.
 */
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import type { ModelGustsData } from "@/lib/weather-service";

export type ModelDayPoint = {
  date: string;
  precipInches: number;
  tempHighF: number;
};

export type EnsemblePlume = {
  dates: string[];
  tempHighMembers: number[][];
  precipMembers: number[][];
  memberCount: number;
};

export type ModelDeskData = {
  gfs: ModelDayPoint[];
  ecmwf: ModelDayPoint[];
  icon: ModelDayPoint[];
  gem: ModelDayPoint[];
  ensemble?: EnsemblePlume;
  agreementScore?: number;
};

const MODELS = [
  { key: "gfs" as const, label: "GFS", color: "var(--wd-citrus,#e8a838)" },
  { key: "ecmwf" as const, label: "ECMWF (Euro)", color: "#4eb8c8" },
  { key: "icon" as const, label: "ICON", color: "#a78bfa" },
  { key: "gem" as const, label: "GEM", color: "#34d399" },
];

type Metric = "precip" | "gusts";

function dayLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  const d = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function sum(arr: ModelDayPoint[]) {
  return arr.reduce((a, d) => a + d.precipInches, 0);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function WeatherModelDesk({
  models,
  gusts,
}: {
  models: ModelDeskData;
  gusts?: ModelGustsData | null;
}) {
  const reduce = useReducedMotion();
  const [metric, setMetric] = useState<Metric>("precip");

  const hasGusts =
    !!gusts &&
    (gusts.gfs.length > 0 ||
      gusts.ecmwf.length > 0 ||
      gusts.icon.length > 0 ||
      gusts.gem.length > 0);
  const activeMetric: Metric = metric === "gusts" && hasGusts ? "gusts" : "precip";

  const series = MODELS.map((m) => ({
    ...m,
    data: models[m.key] ?? [],
    gustDays: gusts?.[m.key] ?? [],
  })).filter((s) => s.data.length > 0 || s.gustDays.length > 0);

  const n = Math.max(
    ...series.map((s) =>
      activeMetric === "gusts" ? s.gustDays.length : s.data.length,
    ),
    1,
  );
  const dates = Array.from({ length: n }, (_, i) => {
    for (const s of series) {
      const d =
        activeMetric === "gusts" ? s.gustDays[i]?.date : s.data[i]?.date;
      if (d) return d;
    }
    return "";
  });

  const valueAt = (s: (typeof series)[0], i: number): number | null => {
    if (activeMetric === "gusts") {
      const d = s.gustDays[i];
      return d ? d.windGustsMph : null;
    }
    const d = s.data[i];
    return d ? d.precipInches : null;
  };

  const allValues = series.flatMap((s) =>
    Array.from({ length: n }, (_, i) => valueAt(s, i)).filter(
      (v): v is number => v != null,
    ),
  );
  const maxV = Math.max(activeMetric === "gusts" ? 20 : 0.5, ...allValues);

  const w = 640;
  const h = 240;
  const pad = { t: 24, r: 16, b: 44, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const xAt = (i: number) =>
    pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (p: number) => pad.t + innerH - (p / maxV) * innerH;
  const fmtAxis = (v: number) =>
    activeMetric === "gusts" ? `${Math.round(v)}` : `${v.toFixed(1)}″`;

  const agreement = models.agreementScore ?? 50;
  const wettest = series.reduce(
    (best, s) => (sum(s.data) > sum(best.data) ? s : best),
    series[0] ?? { label: "Models", data: [] },
  );

  const plume = models.ensemble;
  const plumeDays = plume?.dates ?? [];

  // P10–P90 spread band + median across ensemble members, per day.
  const spread = useMemo(() => {
    if (!plume || plume.tempHighMembers.length === 0) return null;
    const days = Math.min(
      plumeDays.length,
      ...plume.tempHighMembers.map((m) => m.length),
    );
    if (days < 2) return null;
    const p10: number[] = [];
    const p90: number[] = [];
    const med: number[] = [];
    for (let i = 0; i < days; i++) {
      const vals = plume.tempHighMembers
        .map((m) => m[i])
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b);
      p10.push(quantile(vals, 0.1));
      p90.push(quantile(vals, 0.9));
      med.push(quantile(vals, 0.5));
    }
    const lo = Math.floor(Math.min(...p10) - 2);
    const hi = Math.ceil(Math.max(...p90) + 2);
    return { days, p10, p90, med, lo, hi };
  }, [plume, plumeDays]);

  const plumeW = 640;
  const plumeH = 150;
  const plumePad = { t: 10, r: 12, b: 22, l: 36 };
  const plumeX = (i: number, days: number) =>
    plumePad.l +
    (days <= 1 ? 0 : (i / (days - 1)) * (plumeW - plumePad.l - plumePad.r));
  const plumeY = (v: number) => {
    if (!spread) return plumeH / 2;
    const t = (v - spread.lo) / Math.max(spread.hi - spread.lo, 1);
    return plumeH - plumePad.b - t * (plumeH - plumePad.t - plumePad.b);
  };

  // Table rows: one per date, model values for high/precip/gust.
  const tableRows = dates
    .map((date, i) => ({
      date,
      cells: series.map((s) => ({
        key: s.key,
        high: s.data[i]?.tempHighF ?? null,
        precip: s.data[i]?.precipInches ?? null,
        gust: s.gustDays[i]?.windGustsMph ?? null,
      })),
    }))
    .filter((r) => r.date);

  return (
    <div data-ocid="weather-model-desk">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            Model desk
          </h2>
          <p className="mt-1 text-sm text-[var(--wd-muted)]">
            {series.length >= 2
              ? `${wettest.label} wettest this week · ${agreement}% model agreement`
              : "Dual-model precip comparison"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-yellow-400 to-green-400 transition-all"
          style={{ width: `${agreement}%` }}
        />
      </div>
      <p className="mb-3 text-[10px] uppercase tracking-wider text-white/50">
        Model agreement {agreement}%
      </p>

      {hasGusts && (
        <div className="mb-3 flex gap-2">
          {(
            [
              { key: "precip", label: "Precipitation" },
              { key: "gusts", label: "Wind gusts (mph)" },
            ] as Array<{ key: Metric; label: string }>
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMetric(opt.key)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                activeMetric === opt.key
                  ? "border-[var(--wd-citrus,#e8a838)] bg-[var(--wd-citrus,#e8a838)]/20 text-[var(--wd-citrus,#e8a838)]"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-3xl"
        role="img"
        aria-label={
          activeMetric === "gusts"
            ? "Multi-model wind gust comparison"
            : "Multi-model precipitation comparison"
        }
      >
        <rect
          x={pad.l}
          y={pad.t}
          width={innerW}
          height={innerH}
          fill="rgba(255,255,255,0.03)"
          rx="4"
        />
        {[0, 0.5, 1].map((t) => {
          const y = yAt(maxV * (1 - t));
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
              />
              <text
                x={pad.l - 6}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {fmtAxis(maxV * (1 - t))}
              </text>
            </g>
          );
        })}
        {series.map((s, si) => {
          const d = Array.from({ length: n }, (_, i) => valueAt(s, i))
            .map((v, i) =>
              v == null ? null : `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`,
            )
            .filter((seg): seg is string => seg != null)
            .join(" ");
          if (!d) return null;
          return (
            <motion.path
              key={`${s.key}-${activeMetric}`}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: si * 0.08 }}
            />
          );
        })}
        {dates.map((d, i) => (
          <text
            key={d || i}
            x={xAt(i)}
            y={h - 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            {dayLabel(d)}
          </text>
        ))}
      </svg>

      {plume && plumeDays.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-[#0a1628]/80 p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">
            GFS ensemble plume · {plume.memberCount} members
          </h3>
          {spread && (
            <p className="text-[10px] text-white/50">
              Shaded band = 10th–90th percentile daily high · white line =
              ensemble median
            </p>
          )}
          <svg
            viewBox={`0 0 ${plumeW} ${plumeH}`}
            className="mt-2 w-full"
            role="img"
          >
            {spread && (
              <>
                {[spread.lo, (spread.lo + spread.hi) / 2, spread.hi].map(
                  (v) => (
                    <g key={v}>
                      <line
                        x1={plumePad.l}
                        x2={plumeW - plumePad.r}
                        y1={plumeY(v)}
                        y2={plumeY(v)}
                        stroke="rgba(255,255,255,0.08)"
                      />
                      <text
                        x={plumePad.l - 4}
                        y={plumeY(v) + 3}
                        textAnchor="end"
                        fill="rgba(255,255,255,0.4)"
                        fontSize="9"
                        fontFamily="ui-monospace, monospace"
                      >
                        {Math.round(v)}°
                      </text>
                    </g>
                  ),
                )}
                <path
                  d={[
                    ...spread.p90.map(
                      (v, i) =>
                        `${i === 0 ? "M" : "L"} ${plumeX(i, spread.days)} ${plumeY(v)}`,
                    ),
                    ...spread.p10
                      .map(
                        (v, i) =>
                          `L ${plumeX(i, spread.days)} ${plumeY(v)}`,
                      )
                      .reverse(),
                    "Z",
                  ].join(" ")}
                  fill="#4eb8c8"
                  fillOpacity={0.18}
                  stroke="none"
                />
              </>
            )}
            {plume.tempHighMembers.slice(0, 30).map((member, mi) => (
              <polyline
                key={mi}
                fill="none"
                stroke="#4eb8c8"
                strokeOpacity={0.25}
                strokeWidth="1"
                points={member
                  .slice(0, spread?.days ?? member.length)
                  .map(
                    (v, i) =>
                      `${plumeX(i, spread?.days ?? member.length)},${plumeY(v)}`,
                  )
                  .join(" ")}
              />
            ))}
            {spread && (
              <polyline
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                points={spread.med
                  .map((v, i) => `${plumeX(i, spread.days)},${plumeY(v)}`)
                  .join(" ")}
              />
            )}
            {spread &&
              plumeDays.slice(0, spread.days).map((d, i) => (
                <text
                  key={d || i}
                  x={plumeX(i, spread.days)}
                  y={plumeH - 6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="9"
                >
                  {dayLabel(d)}
                </text>
              ))}
          </svg>
        </div>
      )}

      {tableRows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-[#0a1628]/80">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                <th className="px-3 py-2">Day</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2">
                    <span
                      className="mr-1.5 inline-block size-2 rounded-full align-middle"
                      style={{ background: s.color }}
                    />
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.date}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-3 py-2 font-semibold text-white/80">
                    {dayLabel(row.date)}
                  </td>
                  {row.cells.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-white/70">
                      {c.high != null ? `${Math.round(c.high)}°` : "—"}
                      {c.precip != null && (
                        <span className="text-sky-300">
                          {" "}
                          · {c.precip.toFixed(2)}″
                        </span>
                      )}
                      {c.gust != null && (
                        <span className="text-orange-300">
                          {" "}
                          · {Math.round(c.gust)} mph
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 pb-2 pt-1 text-[10px] text-white/40">
            High temp · precip{hasGusts ? " · wind gust" : ""} per model
          </p>
        </div>
      )}
    </div>
  );
}
