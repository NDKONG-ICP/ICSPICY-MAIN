/**
 * Climate Canvas — the plant's life rendered in weather. Recharts,
 * radically restyled: value-mapped heat gradients, water-column rainfall,
 * Scoville-colored UV band with shimmer, care-event markers on the lines,
 * glassmorphism tooltips, and a stats ribbon. Charts lazy-mount below the
 * fold and respect prefers-reduced-motion.
 */
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { downloadTextFile } from "@/lib/plant-nfc-url";
import {
  type WeatherDateRange,
  type WeatherHistoryPoint,
  buildWeatherHistory,
  weatherHistoryToCsv,
} from "@/lib/weather-history";
import { ChevronDown, Download } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type ReactNode,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlantLifecycle } from "../../declarations/backend.did";

const RANGE_OPTIONS: { id: WeatherDateRange; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

type ChartRow = WeatherHistoryPoint & {
  label: string;
  waterDot: number | null;
  feedDot: number | null;
  pestDot: number | null;
  careDetail: string;
};

function formatChartDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Scoville-style UV heat color. */
function uvFill(uv: number): string {
  if (uv >= 8) return "#dc2626";
  if (uv >= 6) return "#f97316";
  if (uv >= 3) return "#fbbf24";
  return "#22c55e";
}

function icTsToDateKey(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toISOString().slice(0, 10);
}

/** "Watered 250ml · Fed FPJ" — per-day care summary from the raw logs. */
function buildCareDetails(lifecycle: PlantLifecycle): Map<string, string> {
  const byDate = new Map<string, string[]>();
  const push = (date: string, entry: string) => {
    const list = byDate.get(date) ?? [];
    list.push(entry);
    byDate.set(date, list);
  };
  for (const w of lifecycle.wateringLog) {
    push(icTsToDateKey(w.timestamp), `💧 Watered ${w.amountMl.toString()}ml`);
  }
  for (const f of lifecycle.feedingLog) {
    push(icTsToDateKey(f.date), `🧪 Fed ${f.product_name}`);
  }
  for (const p of lifecycle.pestLog) {
    push(icTsToDateKey(p.timestamp), `🐛 ${p.pestName}`);
  }
  const out = new Map<string, string>();
  for (const [date, list] of byDate) out.set(date, list.join(" · "));
  return out;
}

// ── Glassmorphism tooltip ────────────────────────────────────────────────────

function ClimateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-white/15 bg-zinc-950/85 px-3 py-2.5 text-xs shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <p className="mb-2 flex items-center justify-between gap-3 font-semibold text-amber-200">
        {formatFullDate(row.date)}
        {row.moonPhase && <span aria-hidden>🌙</span>}
      </p>
      <div className="grid gap-1 text-zinc-300">
        <span>
          <span className="text-red-400">High</span> {row.highF.toFixed(0)}°F ·{" "}
          <span className="text-sky-400">Low</span> {row.lowF.toFixed(0)}°F
        </span>
        <span>
          💧 {row.humidity.toFixed(0)}% · 🌧️ {row.rainInches.toFixed(2)}&quot; ·
          ☀️ UV {row.uvIndex.toFixed(1)}
        </span>
        {(row.windMph != null || row.aqi != null) && (
          <span>
            {row.windMph != null && <>🌬️ {row.windMph.toFixed(0)} mph</>}
            {row.windMph != null && row.aqi != null && " · "}
            {row.aqi != null && <>🫁 AQI {row.aqi}</>}
          </span>
        )}
      </div>
      {row.careDetail ? (
        <p className="mt-2 border-t border-white/10 pt-2 font-medium text-emerald-200">
          {row.careDetail}
        </p>
      ) : (
        <p className="mt-2 border-t border-white/10 pt-2 text-zinc-500">
          No care logs this day
        </p>
      )}
    </div>
  );
}

// ── Care-event markers on the chart line ─────────────────────────────────────

function ActivityDot({
  cx,
  cy,
  emoji,
  color,
}: {
  cx?: number;
  cy?: number;
  emoji: string;
  color: string;
}) {
  if (cx == null || cy == null) return <g />;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth={1.5}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11}>
        {emoji}
      </text>
    </g>
  );
}

// ── Lazy below-the-fold mount ────────────────────────────────────────────────

function LazyChart({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {visible ? children : null}
    </div>
  );
}

// ── Stats ribbon ─────────────────────────────────────────────────────────────

const StatsRibbon = memo(function StatsRibbon({ rows }: { rows: ChartRow[] }) {
  const stats = useMemo(() => {
    const totalRain = rows.reduce((s, r) => s + r.rainInches, 0);
    const hottest = rows.reduce(
      (best, r) => (r.highF > best.highF ? r : best),
      rows[0]!,
    );
    const careEvents = rows.reduce(
      (s, r) =>
        s + (r.watered ? 1 : 0) + (r.fed ? 1 : 0) + (r.pestLogged ? 1 : 0),
      0,
    );
    return { totalRain, hottest, careEvents };
  }, [rows]);

  const items = [
    { emoji: "📅", value: `${rows.length}`, label: "days tracked" },
    {
      emoji: "🌧️",
      value: `${stats.totalRain.toFixed(1)}"`,
      label: "total rain",
    },
    {
      emoji: "🔥",
      value: `${stats.hottest.highF.toFixed(0)}°F`,
      label: formatChartDate(stats.hottest.date),
    },
    { emoji: "🧑‍🌾", value: `${stats.careEvents}`, label: "care events" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 px-2 py-1.5 text-center backdrop-blur-sm"
        >
          <p className="text-sm font-bold text-foreground">
            <span aria-hidden className="mr-0.5">
              {item.emoji}
            </span>
            {item.value}
          </p>
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
});

// ── Main component ───────────────────────────────────────────────────────────

export function WeatherHistoryCharts({
  lifecycle,
}: {
  lifecycle: PlantLifecycle;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [range, setRange] = useState<WeatherDateRange>("30d");
  const [tableOpen, setTableOpen] = useState(false);

  const points = useMemo(
    () => buildWeatherHistory(lifecycle, range),
    [lifecycle, range],
  );
  const careDetails = useMemo(() => buildCareDetails(lifecycle), [lifecycle]);

  const chartData = useMemo<ChartRow[]>(
    () =>
      points.map((p) => ({
        ...p,
        label: formatChartDate(p.date),
        waterDot: p.watered ? p.highF : null,
        feedDot: p.fed ? p.lowF : null,
        pestDot: p.pestLogged ? p.uvIndex : null,
        careDetail: careDetails.get(p.date) ?? "",
      })),
    [points, careDetails],
  );

  // 1.2s draw-in, staggered per chart; disabled entirely for reduced motion.
  const chartAnim = (order: number) => ({
    isAnimationActive: !reducedMotion,
    animationDuration: 1200,
    animationBegin: order * 220,
    animationEasing: "ease-out" as const,
  });

  const plantName =
    lifecycle.plant.common_name.length > 0
      ? lifecycle.plant.common_name[0]!
      : lifecycle.plant.variety;

  const hasScorcher = chartData.some((d) => d.uvIndex >= 8);

  if (points.length === 0) {
    return (
      <div
        data-ocid="weather-history-empty"
        className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
      >
        No weather snapshots yet. Log watering, feeding, or notes to capture
        local weather with each entry.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-ocid="weather-history-charts">
      <style>{`
        @keyframes uv-shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
        .uv-shimmer .recharts-area-area {
          animation: uv-shimmer 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .uv-shimmer .recharts-area-area { animation: none; }
        }
      `}</style>

      {/* Section header + stats ribbon */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-bold text-foreground">
          🌶️ Climate Canvas —{" "}
          <span className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
            {plantName}'s life in weather
          </span>
        </h2>
        <StatsRibbon rows={chartData} />
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={range === opt.id ? "default" : "outline"}
            onClick={() => setRange(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* ── Temperature: heat-gradient area ── */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-950/70 to-stone-950/50 p-4 backdrop-blur-sm">
        <h3 className="mb-3 font-display font-semibold text-foreground">
          Temperature <span className="text-xs text-muted-foreground">°F</span>
        </h3>
        <LazyChart height={240}>
          <ChartContainer
            config={{
              highF: { label: "High", color: "#f97316" },
              lowF: { label: "Low", color: "#60a5fa" },
            }}
            className="h-[240px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  {/* literal heat gradient — deep red (hottest) → orange → amber, by value */}
                  <linearGradient id="heatByValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7f1d1d" stopOpacity={0.9} />
                    <stop offset="35%" stopColor="#f97316" stopOpacity={0.55} />
                    <stop offset="75%" stopColor="#fbbf24" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="heatStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                  <linearGradient id="coolLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0c4a6e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  unit="°"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ClimateTooltip />}
                  cursor={{ stroke: "#f97316", strokeOpacity: 0.35 }}
                />
                <Area
                  type="monotone"
                  dataKey="highF"
                  stroke="url(#heatStroke)"
                  fill="url(#heatByValue)"
                  strokeWidth={2.5}
                  {...chartAnim(0)}
                />
                <Area
                  type="monotone"
                  dataKey="lowF"
                  stroke="#60a5fa"
                  fill="url(#coolLow)"
                  strokeWidth={1.5}
                  {...chartAnim(0)}
                />
                {/* care markers ON the line */}
                <Line
                  type="monotone"
                  dataKey="waterDot"
                  stroke="transparent"
                  isAnimationActive={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props as {
                      cx?: number;
                      cy?: number;
                      payload?: ChartRow;
                    };
                    if (!payload?.watered) return <g />;
                    return (
                      <ActivityDot cx={cx} cy={cy} emoji="💧" color="#38bdf8" />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="feedDot"
                  stroke="transparent"
                  isAnimationActive={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props as {
                      cx?: number;
                      cy?: number;
                      payload?: ChartRow;
                    };
                    if (!payload?.fed) return <g />;
                    return (
                      <ActivityDot cx={cx} cy={cy} emoji="🧪" color="#fbbf24" />
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </LazyChart>
        <p className="mt-1 text-xs text-muted-foreground">
          💧 watering · 🧪 feeding — markers ride the temperature line
        </p>
      </div>

      {/* ── Rainfall: falling water columns + humidity ── */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-950/70 to-slate-950/50 p-4 backdrop-blur-sm">
        <h3 className="mb-3 font-display font-semibold text-foreground">
          Humidity &amp; Rainfall
        </h3>
        <LazyChart height={240}>
          <ChartContainer
            config={{
              rainInches: { label: "Rain (in)", color: "#38bdf8" },
              humidity: { label: "Humidity %", color: "#fbbf24" },
            }}
            className="h-[240px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  {/* water column — bright crest, deep base */}
                  <linearGradient id="waterColumn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.95} />
                    <stop offset="45%" stopColor="#38bdf8" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="humidityHaze" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  unit='"'
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ClimateTooltip />}
                  cursor={{ fill: "rgba(56,189,248,0.08)" }}
                />
                {/* bars "fill up" from the bottom on mount */}
                <Bar
                  yAxisId="left"
                  dataKey="rainInches"
                  fill="url(#waterColumn)"
                  radius={[6, 6, 0, 0]}
                  {...chartAnim(1)}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#fbbf24"
                  fill="url(#humidityHaze)"
                  strokeWidth={1.5}
                  {...chartAnim(1)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </LazyChart>
      </div>

      {/* ── UV: flame-intensity band ── */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-950/70 to-red-950/20 p-4 backdrop-blur-sm">
        <h3 className="mb-3 font-display font-semibold text-foreground">
          UV Index{" "}
          <span className="text-xs text-muted-foreground">
            Scoville-style heat band
          </span>
        </h3>
        <LazyChart height={220}>
          <ChartContainer
            config={{ uvIndex: { label: "UV", color: "#f97316" } }}
            className={`h-[220px] w-full ${hasScorcher && !reducedMotion ? "uv-shimmer" : ""}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  domain={[0, 12]}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine
                  y={6}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={8}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <Tooltip
                  content={<ClimateTooltip />}
                  cursor={{ stroke: "#f97316", strokeOpacity: 0.25 }}
                />
                <defs>
                  {/* per-day Scoville coloring across the horizontal axis */}
                  <linearGradient id="uvScoville" x1="0" y1="0" x2="1" y2="0">
                    {chartData.map((d, i) => (
                      <stop
                        key={d.date}
                        offset={`${(i / Math.max(chartData.length - 1, 1)) * 100}%`}
                        stopColor={uvFill(d.uvIndex)}
                        stopOpacity={0.55}
                      />
                    ))}
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="uvIndex"
                  stroke="#f97316"
                  fill="url(#uvScoville)"
                  strokeWidth={2.5}
                  {...chartAnim(2)}
                />
                <Line
                  type="monotone"
                  dataKey="pestDot"
                  stroke="transparent"
                  isAnimationActive={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props as {
                      cx?: number;
                      cy?: number;
                      payload?: ChartRow;
                    };
                    if (!payload?.pestLogged) return <g />;
                    return (
                      <ActivityDot cx={cx} cy={cy} emoji="🐛" color="#f87171" />
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </LazyChart>
        <p className="mt-1 text-xs text-muted-foreground">
          🐛 = pest treatment logged · red band = UV 8+ scorchers
        </p>
      </div>

      {/* ── Data table + CSV ── */}
      <div className="rounded-xl border border-border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
          onClick={() => setTableOpen((o) => !o)}
        >
          Data table
          <ChevronDown
            className={`size-4 transition ${tableOpen ? "rotate-180" : ""}`}
          />
        </button>
        {tableOpen && (
          <div className="border-t border-border p-4">
            <div className="mb-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadTextFile(
                    `plant-${lifecycle.plant.id}-weather.csv`,
                    weatherHistoryToCsv(points),
                  )
                }
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">High</th>
                    <th className="py-2 pr-3">Low</th>
                    <th className="py-2 pr-3">Humidity</th>
                    <th className="py-2 pr-3">Rain</th>
                    <th className="py-2 pr-3">UV</th>
                    <th className="py-2 pr-3">Wind</th>
                    <th className="py-2 pr-3">AQI</th>
                    <th className="py-2">Moon</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <WeatherTableRow key={p.date} point={p} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const WeatherTableRow = memo(function WeatherTableRow({
  point: p,
}: {
  point: WeatherHistoryPoint;
}) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-3 font-mono">{p.date}</td>
      <td className="py-2 pr-3">{p.highF.toFixed(0)}°F</td>
      <td className="py-2 pr-3">{p.lowF.toFixed(0)}°F</td>
      <td className="py-2 pr-3">{p.humidity.toFixed(0)}%</td>
      <td className="py-2 pr-3">{p.rainInches.toFixed(2)}&quot;</td>
      <td className="py-2 pr-3">{p.uvIndex.toFixed(1)}</td>
      <td className="py-2 pr-3">{p.windMph?.toFixed(0) ?? "—"}</td>
      <td className="py-2 pr-3">{p.aqi ?? "—"}</td>
      <td className="py-2">{p.moonPhase ?? "—"}</td>
    </tr>
  );
});
