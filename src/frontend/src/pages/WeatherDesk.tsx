/**
 * /weather — IC SPICY Weather Desk (cinematic SWFL phase)
 * On-chain outlook + cinematic heroes + interactive outlook + MCP showpiece.
 */
import { Link } from "@tanstack/react-router";
import {
  Check,
  CloudRain,
  Copy,
  Droplets,
  Leaf,
  MapPin,
  Sun,
  Wind,
} from "lucide-react";
import { useMotionValueEvent, useSpring } from "motion/react";
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { Seo } from "../components/Seo";
import { openSpicyAi } from "../components/SpicyAiWidget";
import { WeatherRadarMap } from "../components/nims/WeatherRadarMap";
import { WeatherBrandMark } from "../components/weather/WeatherBrandMark";
import { WeatherHeroCinematic } from "../components/weather/WeatherHeroCinematic";
import { WeatherOutlookInteractive } from "../components/weather/WeatherOutlookInteractive";
import { TropicalDeskPanel } from "../components/weather/TropicalDeskPanel";
import { WeatherDailyAlmanac } from "../components/weather/WeatherDailyAlmanac";
import { WeatherInstallPrompt } from "../components/weather/WeatherInstallPrompt";
import { WeatherModelDesk } from "../components/weather/WeatherModelDesk";
import { WeatherNwsBanner } from "../components/weather/WeatherNwsBanner";
import { WeatherSourceLedgerPanel } from "../components/weather/WeatherSourceLedgerPanel";
import { skyStateFromWeather } from "../components/weather/WeatherSkyStage";
import { useWeather } from "../hooks/useWeather";
import { staticRouteSeo } from "../lib/seo-routes.mjs";
import {
  WEATHER_MCP_CANISTER_ID,
  WEATHER_MCP_TOOLS,
  WEATHER_MCP_URL,
  callWeatherMcpTool,
} from "../lib/weather-mcp";
import {
  NURSERY_LAT,
  NURSERY_LNG,
  aqiRingColor,
  fetchDailyAlmanac,
  fetchGrowerAlerts,
  fetchModelGusts,
  type ModelGustsData,
  fetchTropicalSummary,
  resolveWeatherZip,
  uvIndexClass,
  type DailyAlmanacData,
  type GrowerAlertData,
  type TropicalSummaryData,
} from "../lib/weather-service";
import { downloadWeatherShareCard } from "../lib/weather-share";
import { cn } from "@/lib/utils";

const WEATHER_SEO = staticRouteSeo("/weather");

function CountUpTemp({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 70, damping: 20 });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  useMotionValueEvent(spring, "change", (v) => setDisplay(Math.round(v)));
  return (
    <span className="font-display text-6xl sm:text-8xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
      {display}°
    </span>
  );
}

export default function WeatherDeskPage() {
  const [lat, setLat] = useState(NURSERY_LAT);
  const [lng, setLng] = useState(NURSERY_LNG);
  const [label, setLabel] = useState("Port Charlotte, FL (nursery)");
  const [zipInput, setZipInput] = useState("33954");
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [tropical, setTropical] = useState<TropicalSummaryData | null>(null);
  const [tropicalBusy, setTropicalBusy] = useState(true);
  const [almanac, setAlmanac] = useState<DailyAlmanacData | null>(null);
  const [growerAlerts, setGrowerAlerts] = useState<GrowerAlertData[]>([]);
  const [modelGusts, setModelGusts] = useState<ModelGustsData | null>(null);
  const [mcpDemo, setMcpDemo] = useState<string | null>(null);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useWeather(lat, lng);

  useEffect(() => {
    let cancelled = false;
    setTropicalBusy(true);
    void (async () => {
      const s = await fetchTropicalSummary(false);
      if (!cancelled) {
        setTropical(s);
        setTropicalBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [a, alerts, gusts] = await Promise.all([
        fetchDailyAlmanac(),
        fetchGrowerAlerts(lat, lng),
        fetchModelGusts(lat, lng),
      ]);
      if (!cancelled) {
        setAlmanac(a);
        setGrowerAlerts(alerts);
        setModelGusts(gusts);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  // Gusts are cached by the outlook refresh — refetch once outlook resolves.
  const modelsReady = !!data?.models;
  useEffect(() => {
    if (!modelsReady) return;
    let cancelled = false;
    void (async () => {
      const gusts = await fetchModelGusts(lat, lng);
      if (!cancelled && gusts) setModelGusts(gusts);
    })();
    return () => {
      cancelled = true;
    };
  }, [modelsReady, lat, lng]);

  const sky = data
    ? skyStateFromWeather(data.current.weatherCode, data.current.tempF)
    : "clear";

  async function onResolveZip(e: FormEvent) {
    e.preventDefault();
    setZipError(null);
    setZipBusy(true);
    try {
      const r = await resolveWeatherZip(zipInput.trim());
      setLat(r.lat);
      setLng(r.lng);
      setLabel(r.displayLabel);
      setZipInput(r.zip);
    } catch (err) {
      setZipError(
        err instanceof Error ? err.message : "Could not resolve ZIP on-chain",
      );
    } finally {
      setZipBusy(false);
    }
  }

  function useNursery() {
    setLat(NURSERY_LAT);
    setLng(NURSERY_LNG);
    setLabel("Port Charlotte, FL (nursery)");
    setZipInput("33954");
    setZipError(null);
  }

  async function copyMcpUrl() {
    if (!WEATHER_MCP_URL) return;
    try {
      await navigator.clipboard.writeText(WEATHER_MCP_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function runMcpDemo() {
    setMcpBusy(true);
    setMcpDemo(null);
    const r = await callWeatherMcpTool("get_nursery_conditions");
    setMcpDemo(r.text.slice(0, 520) + (r.text.length > 520 ? "…" : ""));
    setMcpBusy(false);
  }

  const models = data?.models;
  const modelDesk =
    models &&
    (models.gfs.length > 0 ||
      models.ecmwf.length > 0 ||
      (models.icon?.length ?? 0) > 0 ||
      (models.gem?.length ?? 0) > 0)
      ? {
          gfs: models.gfs,
          ecmwf: models.ecmwf,
          icon: models.icon ?? [],
          gem: models.gem ?? [],
          agreementScore: models.agreementScore,
          ensemble: models.ensemble,
        }
      : null;
  const days = data?.outlookDays ?? [];
  const alerts: Array<{ title: string; body: string; tone: string }> = [];
  if (data) {
    if (data.daily.totalRainInches >= 1.5) {
      alerts.push({
        title: "Heavy rain",
        body: `~${data.daily.totalRainInches.toFixed(2)}" today — mulch, check drainage, delay foliar.`,
        tone: "border-cyan-500/40 text-cyan-100",
      });
    }
    if (data.current.windSpeedMph >= 30 || data.daily.maxWindMph >= 30) {
      alerts.push({
        title: "High wind",
        body: "Stake tall peppers and secure shade cloth.",
        tone: "border-sky-500/40 text-sky-100",
      });
    }
    if (data.daily.highF >= 100 || data.current.feelsLikeF >= 105) {
      alerts.push({
        title: "Extreme heat",
        body: "Water early; shade west-facing beds this afternoon.",
        tone: "border-orange-500/40 text-orange-100",
      });
    }
    if (data.daily.maxUvIndex >= 8) {
      alerts.push({
        title: "High UV",
        body: "Afternoon shade cloth helps tender transplants.",
        tone: "border-amber-500/40 text-amber-100",
      });
    }
  }
  if (tropical) {
    for (const st of tropical.storms) {
      if (st.basin !== "atlantic" || st.maxWindKt < 34) continue;
      alerts.push({
        title: `${st.classification} ${st.name}`,
        body: `${st.movementText} · Adv ${st.advisoryNum}. Prep mulch, drainage, stakes. Not an official NHC product.`,
        tone:
          st.maxWindKt >= 64
            ? "border-red-500/40 text-red-100"
            : "border-orange-500/40 text-orange-100",
      });
    }
  }

  return (
    <div
      data-weather-desk
      data-ocid="weather-desk-page"
      className="min-h-screen bg-[#0e0d0b] text-[var(--wd-ink,#f5f0eb)]"
      style={
        {
          "--wd-sky-clear": "oklch(0.72 0.08 220)",
          "--wd-gulf": "oklch(0.55 0.1 200)",
          "--wd-citrus": "oklch(0.82 0.14 95)",
          "--wd-heat": "oklch(0.68 0.2 35)",
          "--wd-rain": "oklch(0.65 0.12 230)",
          "--wd-ink": "oklch(0.94 0.01 60)",
          "--wd-muted": "oklch(0.62 0.02 55)",
        } as CSSProperties
      }
    >
      <Seo
        title={WEATHER_SEO.title}
        description={WEATHER_SEO.description}
        path="/weather"
        jsonLd={WEATHER_SEO.jsonLd ?? undefined}
      />

      {/* ── Cinematic hero ── */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <WeatherHeroCinematic
          state={sky}
          className="pointer-events-none absolute inset-0"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#0e0d0b_0%,rgba(14,13,11,0.72)_38%,rgba(14,13,11,0.25)_62%,transparent_82%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-end px-4 pb-12 pt-28 sm:px-6">
          <WeatherBrandMark className="mb-6" />
          <p className="font-display text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-white/85">
            Charlotte County · Southwest Florida · On-chain
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-[1.1] text-white drop-shadow-md sm:text-5xl md:text-[3.25rem]">
            Florida weather you can trust — built after Charley and Ian.
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/80 sm:text-lg leading-relaxed">
            Free grower outlook from the Internet Computer. Cinematic SWFL
            skies. Agent-native MCP. Not a substitute for NWS or NHC — a desk
            for the beds.
          </p>

          <form
            onSubmit={onResolveZip}
            className="mt-8 flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-white/60">
              ZIP
              <input
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                inputMode="numeric"
                maxLength={10}
                className="h-11 w-28 rounded-sm border border-white/25 bg-black/45 px-3 font-mono text-base text-white outline-none backdrop-blur-sm focus:border-[var(--wd-citrus)]"
                aria-label="US ZIP code"
              />
            </label>
            <button
              type="submit"
              disabled={zipBusy}
              className="h-11 rounded-sm bg-[var(--wd-citrus)] px-5 font-display text-sm font-semibold text-[#1a1510] disabled:opacity-60"
            >
              {zipBusy ? "Resolving…" : "Go"}
            </button>
            <button
              type="button"
              onClick={useNursery}
              className="h-11 rounded-sm border border-white/30 bg-black/30 px-4 text-sm text-white/90 backdrop-blur-sm hover:bg-white/10"
            >
              Nursery (33954)
            </button>
            <button
              type="button"
              onClick={() => {
                if (!data) return;
                const headline = tropical?.storms[0]
                  ? `${tropical.storms[0].classification} ${tropical.storms[0].name}`
                  : undefined;
                void downloadWeatherShareCard({
                  locationLabel: label,
                  tempF: data.current.tempF,
                  condition: data.current.weatherDescription,
                  tropicalHeadline: headline,
                });
              }}
              className="h-11 rounded-sm border border-white/25 bg-black/30 px-4 text-sm text-white/90 backdrop-blur-sm hover:bg-white/10"
            >
              Share card
            </button>
            <button
              type="button"
              onClick={() =>
                openSpicyAi(
                  "Explain my Florida grower weather outlook and what I should do for my pepper beds today.",
                  { weather: { lat, lng } },
                )
              }
              className="h-11 text-sm font-medium text-[var(--wd-citrus)] underline-offset-4 hover:underline"
            >
              Ask SpicyAi
            </button>
          </form>
          {zipError && (
            <p className="mt-2 text-sm text-orange-300">{zipError}</p>
          )}
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
            <MapPin className="size-3.5" aria-hidden />
            {label}
            {data?.onChain && (
              <span className="ml-1 rounded-sm border border-[var(--wd-citrus)]/40 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--wd-citrus)]">
                on-chain
                {data.stale ? " · stale" : ""}
              </span>
            )}
          </p>

          <div className="mt-10 flex flex-wrap items-end gap-8">
            {isLoading && !data ? (
              <p className="text-white/60">Loading on-chain outlook…</p>
            ) : isError && !data ? (
              <div>
                <p className="text-orange-200">Outlook unavailable.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 text-sm underline"
                >
                  Retry
                </button>
              </div>
            ) : data ? (
              <>
                <div>
                  <CountUpTemp value={data.current.tempF} />
                  <p className="text-white/75 text-base mt-1">
                    Feels {Math.round(data.current.feelsLikeF)}° ·{" "}
                    {data.current.weatherDescription}
                  </p>
                </div>
                <div className="text-sm text-white/80 space-y-1.5 border-l border-white/20 pl-5">
                  <p>
                    High {Math.round(data.daily.highF)}° · Low{" "}
                    {Math.round(data.daily.lowF)}°
                  </p>
                  <p>
                    Rain today {data.daily.totalRainInches.toFixed(2)}″ · Wind{" "}
                    {Math.round(data.current.windSpeedMph)} mph
                  </p>
                  <p className="text-[var(--wd-citrus)] font-display text-xs uppercase tracking-wider pt-1">
                    IC SPICY nursery desk
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Doppler ── */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 border-t border-white/10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[var(--wd-citrus)] mb-2">
          Live cells
        </p>
        <h2 className="font-display text-2xl font-bold mb-2">Live Doppler</h2>
        <p className="text-sm text-[var(--wd-muted)] mb-5 max-w-xl leading-relaxed">
          RainViewer radar on your desk pin. Browser tiles — not the on-chain
          oracle. Forecast numbers still come from the canister.
        </p>
        <WeatherRadarMap
          lat={lat}
          lng={lng}
          locationLabel={label}
          className="relative min-h-64 overflow-hidden rounded-sm border border-white/12 bg-[#0a0c10] ring-1 ring-white/5"
        />
      </section>

      {/* ── Now ── */}
      {data && (
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
          <h2 className="font-display text-2xl font-bold mb-6">Now</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Metric
              icon={<Droplets className="size-5 text-cyan-400" />}
              label="Humidity"
              value={`${Math.round(data.current.humidity)}%`}
            />
            <Metric
              icon={<Wind className="size-5 text-sky-300" />}
              label="Wind"
              value={`${Math.round(data.current.windSpeedMph)} mph ${data.current.windDirection}`}
            />
            <Metric
              icon={<Sun className={cn("size-5", uvIndexClass(data.current.uvIndex))} />}
              label="UV"
              value={String(Math.round(data.current.uvIndex))}
            />
            <Metric
              icon={<CloudRain className="size-5 text-cyan-300" />}
              label="AQI"
              value={
                <span style={{ color: aqiRingColor(data.airQuality.aqi) }}>
                  {data.airQuality.aqi} · {data.airQuality.level}
                </span>
              }
            />
          </div>
          {alerts.length > 0 && (
            <ul className="mt-8 space-y-2">
              {alerts.map((a) => (
                <li
                  key={a.title}
                  className={cn("border-l-2 pl-3 py-1 text-sm", a.tone)}
                >
                  <strong className="font-display">{a.title}</strong>
                  {" — "}
                  {a.body}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── NWS + grower alerts ── */}
      {(growerAlerts.length > 0 || data?.extremeWeather) && (
        <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <WeatherNwsBanner alerts={growerAlerts} />
        </section>
      )}

      {/* ── Daily almanac ── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
        <WeatherDailyAlmanac almanac={almanac} />
      </section>
      {days.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
          <WeatherOutlookInteractive days={days} lat={lat} lng={lng} />
        </section>
      )}

      {/* ── Model desk ── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
        {modelDesk ? (
          <WeatherModelDesk models={modelDesk} gusts={modelGusts} />
        ) : (
          <div>
            <h2 className="font-display text-2xl font-bold mb-2">Model desk</h2>
            <p className="text-sm text-[var(--wd-muted)]">
              {isFetching
                ? "Refreshing GFS / Euro / ICON / GEM on-chain…"
                : "Four-model spread loads with the next outlook refresh."}
            </p>
          </div>
        )}
      </section>

      {/* ── Tropical desk ── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
        {tropicalBusy && !tropical ? (
          <div>
            <h2 className="font-display text-2xl font-bold mb-2">Tropical desk</h2>
            <p className="text-sm text-[var(--wd-muted)]">
              Loading NOAA GIS tropical feed on-chain…
            </p>
          </div>
        ) : tropical ? (
          <TropicalDeskPanel
            summary={tropical}
            nurseryLat={NURSERY_LAT}
            nurseryLng={NURSERY_LNG}
          />
        ) : (
          <div>
            <h2 className="font-display text-2xl font-bold mb-2">Tropical desk</h2>
            <p className="max-w-xl text-sm text-[var(--wd-muted)] leading-relaxed">
              Tropical cache not ready yet. Follow{" "}
              <a
                href="https://www.nhc.noaa.gov/"
                className="text-[var(--wd-citrus)] underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                NHC
              </a>{" "}
              for official products.
            </p>
          </div>
        )}
      </section>

      {/* ── SpicyAi ── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[var(--wd-citrus)] mb-2">
          Nursery brain
        </p>
        <h2 className="font-display text-2xl font-bold mb-2">Ask SpicyAi</h2>
        <p className="text-sm text-[var(--wd-muted)] mb-6 max-w-xl">
          Grounded in on-chain brief + Module 5 grower practice — mulch,
          drainage, biology after a blow.
        </p>
        <div className="flex flex-wrap gap-3">
          {(tropical && tropical.storms.some((s) => s.basin === "atlantic")
            ? [
                "Storm prep checklist for my Port Charlotte pepper beds before this tropical system.",
                "What mulch and drainage steps should I take in the next 24 hours for hurricane season?",
                "Post-storm soil biology recovery order for Zone 10a peppers.",
              ]
            : [
                "Brief me on today’s grower outlook for Port Charlotte peppers.",
                "Storm prep checklist for my pepper beds before heavy rain.",
                "Should I skip foliar FPJ spray this week given the forecast?",
              ]
          ).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => openSpicyAi(prompt, { weather: { lat, lng } })}
              className="rounded-sm border border-white/15 px-4 py-2 text-left text-sm text-white/85 hover:border-[var(--wd-citrus)]/50 hover:bg-white/5"
            >
              {prompt.length > 48 ? `${prompt.slice(0, 48)}…` : prompt}
            </button>
          ))}
        </div>
      </section>

      {/* ── On-chain + MCP showpiece ── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[var(--wd-citrus)] mb-2">
          Internet Computer
        </p>
        <h2 className="font-display text-2xl font-bold mb-2">On-chain oracle</h2>
        <p className="text-sm text-[var(--wd-muted)] max-w-xl leading-relaxed">
          Forecasts are fetched by the IC SPICY backend via HTTPS outcalls,
          canonicalized for consensus, and served from stable memory. No
          browser weather API in the critical path.
          {data?.lastUpdated && (
            <>
              {" "}
              Last fetch:{" "}
              <span className="font-mono text-white/70">
                {data.lastUpdated.toLocaleString()}
              </span>
              {data.gridKey && (
                <>
                  {" "}
                  · grid{" "}
                  <span className="font-mono text-white/70">{data.gridKey}</span>
                </>
              )}
            </>
          )}
        </p>

        <div className="mt-12 rounded-sm border border-[var(--wd-citrus)]/25 bg-gradient-to-br from-[#1a1510] to-[#0c1820] p-5 sm:p-8">
          <h3 className="font-display text-xl sm:text-2xl font-bold">
            Weather MCP — agent-native Florida weather
          </h3>
          <p className="mt-2 text-sm text-[var(--wd-muted)] max-w-2xl leading-relaxed">
            Public Model Context Protocol on a dedicated canister. Same cache
            SpicyAi uses. Five tools. Rate-limited. Built for agents — and for
            anyone who wants grower weather that lives on the IC.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {WEATHER_MCP_TOOLS.map((t) => (
              <code
                key={t}
                className="rounded-sm border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] text-[var(--wd-citrus)]"
              >
                {t}
              </code>
            ))}
          </div>

          <dl className="mt-6 space-y-3 font-mono text-[11px] sm:text-xs text-white/75">
            <div>
              <dt className="text-[var(--wd-muted)] not-italic font-sans text-xs mb-0.5">
                Canister
              </dt>
              <dd>{WEATHER_MCP_CANISTER_ID || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--wd-muted)] not-italic font-sans text-xs mb-0.5">
                MCP URL
              </dt>
              <dd className="break-all">{WEATHER_MCP_URL || "—"}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyMcpUrl()}
              disabled={!WEATHER_MCP_URL}
              className="inline-flex items-center gap-2 rounded-sm bg-[var(--wd-citrus)] px-4 py-2.5 font-display text-sm font-semibold text-[#1a1510] disabled:opacity-50"
            >
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy MCP URL"}
            </button>
            <a
              href="https://github.com/modelcontextprotocol/inspector"
              className="inline-flex items-center rounded-sm border border-white/20 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5"
              target="_blank"
              rel="noreferrer"
            >
              MCP Inspector →
            </a>
            <button
              type="button"
              onClick={() => void runMcpDemo()}
              disabled={mcpBusy || !WEATHER_MCP_URL}
              className="inline-flex items-center rounded-sm border border-[var(--wd-citrus)]/40 px-4 py-2.5 text-sm text-[var(--wd-citrus)] hover:bg-[var(--wd-citrus)]/10 disabled:opacity-50"
            >
              {mcpBusy ? "Calling canister…" : "Live demo: nursery conditions"}
            </button>
          </div>

          {mcpDemo && (
            <pre className="mt-4 max-h-48 overflow-auto rounded-sm border border-white/10 bg-black/50 p-3 font-mono text-[10px] sm:text-xs text-cyan-100/90 whitespace-pre-wrap break-all">
              {mcpDemo}
            </pre>
          )}
        </div>
      </section>

      {/* ── Source ledger ── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
        <h2 className="font-display text-2xl font-bold">Weather source ledger</h2>
        <p className="mt-2 text-sm text-[var(--wd-muted)] max-w-2xl">
          Append-only audit of NOAA, Open-Meteo, and NWS fetches with parser version and body digests.
          Certified query endpoints (<code className="text-[var(--wd-citrus)]">getWeatherOutlookCertified</code>, tropical, NWS, almanac) include subnet BLS witnesses for verification.
        </p>
        <div className="mt-6">
          <WeatherSourceLedgerPanel />
        </div>
      </section>

      {/* ── NIMS ── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <Leaf className="size-5 text-[var(--wd-citrus)]" aria-hidden />
          <h2 className="font-display text-2xl font-bold">Plant provenance</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--wd-muted)] max-w-xl">
          NIMS captures daily weather onto each plant’s on-chain lifecycle — the
          same oracle family as this desk.
        </p>
        <Link
          to="/nims"
          className="mt-4 inline-block text-sm font-medium text-[var(--wd-citrus)] underline-offset-4 hover:underline"
        >
          Open NIMS →
        </Link>
      </section>

      <WeatherInstallPrompt />

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-[var(--wd-muted)]">
        Aggregated public weather via on-chain HTTPS outcalls. Not an official
        NWS or NHC forecast. IC SPICY · Port Charlotte, Southwest Florida.
      </footer>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[var(--wd-muted)] text-xs uppercase tracking-wide mb-1">
        {icon}
        {label}
      </div>
      <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
