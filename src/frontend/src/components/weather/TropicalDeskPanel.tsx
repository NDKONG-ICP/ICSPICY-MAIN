/**
 * Broadcast-style tropical tracker — Leaflet map with official NHC GIS layers
 * (cone of uncertainty, forecast track, coastal watches/warnings, past track),
 * spaghetti models from on-chain ATCF a-decks, radar overlay, NHC-style
 * advisory cards, ACE season panel, development outlook, and intensity chart.
 */
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import {
  formatInitTime,
  parseAdeckGz,
  type ParsedAdeck,
} from "@/lib/atcf";
import {
  fetchNhcGisLayers,
  hasAnyGisData,
  TCWW_STYLES,
  type NhcGisLayers,
} from "@/lib/nhc-gis";
import {
  buildRainViewerTileTemplate,
  fetchRainViewerRadarData,
} from "@/lib/rainviewer-radar";
import {
  fetchTropicalAdecks,
  type TropicalSummaryData,
} from "@/lib/weather-service";

function stormColor(kt: number): string {
  if (kt >= 113) return "#c026d3";
  if (kt >= 96) return "#ef4444";
  if (kt >= 74) return "#f97316";
  if (kt >= 34) return "#eab308";
  return "#38bdf8";
}

function ktToMph(kt: number): number {
  return Math.round(kt * 1.15078);
}

/** NOAA outlook probabilities arrive as "40%" — strip so we add one "%". */
function probText(p: string): string {
  return p.replace(/%+$/, "");
}

type LayerToggles = {
  cone: boolean;
  alerts: boolean;
  spaghetti: boolean;
  radar: boolean;
};

const TOGGLE_LABELS: Array<{ key: keyof LayerToggles; label: string }> = [
  { key: "cone", label: "Cone & track" },
  { key: "alerts", label: "Watches/warnings" },
  { key: "spaghetti", label: "Spaghetti models" },
  { key: "radar", label: "Radar" },
];

function AdvisoryCard({
  storm,
}: {
  storm: TropicalSummaryData["storms"][0];
}) {
  const mph = ktToMph(storm.maxWindKt);
  const pressure = storm.pressureMb ?? "—";
  return (
    <div className="overflow-hidden rounded-lg border border-white/15 bg-[#0a1628]/95 shadow-xl">
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a3050] px-4 py-2">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-[var(--wd-citrus,#e8a838)]">
          {storm.classification} {storm.name}
        </p>
        <p className="text-[10px] text-white/60">
          Advisory #{storm.advisoryNum} · {storm.movementText}
        </p>
      </div>
      <div className="grid grid-cols-4 divide-x divide-white/10 bg-[#061018] text-center">
        {[
          { label: "WIND", value: `${mph} MPH` },
          { label: "PRESSURE", value: `${pressure} MB` },
          { label: "MOVEMENT", value: storm.movementText.split(" ")[0] ?? "—" },
          {
            label: "LOCATION",
            value: `${storm.lat.toFixed(1)}°N ${Math.abs(storm.lng).toFixed(1)}°W`,
          },
        ].map((cell) => (
          <div key={cell.label} className="px-2 py-3">
            <p className="text-[9px] font-bold tracking-wider text-white/50">
              {cell.label}
            </p>
            <p className="mt-1 font-mono text-xs font-bold text-white">
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AceSeasonPanel({ summary }: { summary: TropicalSummaryData }) {
  const ace = summary.aceStats;
  if (!ace) return null;
  const pct =
    ace.seasonRecord > 0
      ? Math.min(100, (ace.seasonTotal / ace.seasonRecord) * 100)
      : 0;
  const avgPct =
    ace.seasonRecord > 0
      ? Math.min(100, (ace.seasonAverage / ace.seasonRecord) * 100)
      : 15;

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a1628]/90 p-4">
      <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">
        Accumulated Cyclone Energy
      </h3>
      <p className="text-[10px] text-white/50">
        Season total vs. average ({ace.seasonAverage}) and record (
        {ace.seasonRecord})
      </p>
      <div className="mt-4 flex gap-4">
        <div className="relative h-32 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-t from-blue-600 via-green-400 via-30% via-yellow-400 via-60% to-fuchsia-600">
          <div
            className="absolute right-0 w-full border-t-2 border-white/80"
            style={{ bottom: `${pct}%` }}
          />
          <div
            className="absolute right-0 w-full border-t border-dashed border-white/40"
            style={{ bottom: `${avgPct}%` }}
          />
        </div>
        <div className="flex-1 space-y-1 text-xs">
          <p className="font-bold text-fuchsia-300">
            {ace.seasonRecord.toFixed(1)} RECORD
          </p>
          <p className="font-bold text-green-400">
            {ace.seasonAverage.toFixed(1)} AVERAGE
          </p>
          <p className="font-bold text-sky-300">
            {ace.seasonTotal.toFixed(1)} SO FAR
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(ace.seasonNames ?? []).slice(0, 12).map((name) => {
              const hit = ace.storms?.find(
                (s) => s.name.toLowerCase() === name.toLowerCase(),
              );
              return (
                <span
                  key={name}
                  className={
                    hit
                      ? "rounded px-1.5 py-0.5 bg-red-500/20 text-red-300 font-semibold"
                      : "text-white/40"
                  }
                >
                  {hit ? "🌀 " : ""}
                  {name}
                  {hit ? ` ${hit.ace.toFixed(1)}` : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntensityChart({
  storm,
}: {
  storm: TropicalSummaryData["storms"][0];
}) {
  const track = storm.forecastTrack ?? [];
  if (track.length === 0) return null;
  const w = 640;
  const h = 180;
  const pad = { t: 16, r: 12, b: 28, l: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxWind = Math.max(157, ...track.map((p) => p.maxWindKt));
  const xAt = (i: number) =>
    pad.l + (track.length <= 1 ? innerW / 2 : (i / (track.length - 1)) * innerW);
  const yAt = (kt: number) => pad.t + innerH - (kt / maxWind) * innerH;
  const bands = [
    { y: 0, h: 39, color: "#38bdf8", label: "TD" },
    { y: 39, h: 35, color: "#22c55e", label: "TS" },
    { y: 74, h: 22, color: "#eab308", label: "CAT1" },
    { y: 96, h: 15, color: "#f97316", label: "CAT2" },
    { y: 111, h: 19, color: "#ef4444", label: "CAT3" },
    { y: 130, h: 27, color: "#c026d3", label: "CAT4" },
    { y: 157, h: 43, color: "#a855f7", label: "CAT5" },
  ];

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a1628]/90 p-3">
      <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-white">
        {storm.name} — Forecast intensity
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
        {bands.map((b) => (
          <g key={b.label}>
            <rect
              x={pad.l}
              y={yAt(b.y + b.h)}
              width={innerW}
              height={yAt(b.y) - yAt(b.y + b.h)}
              fill={b.color}
              fillOpacity={0.25}
            />
            <text
              x={pad.l - 4}
              y={yAt(b.y + b.h / 2)}
              textAnchor="end"
              fill="white"
              fillOpacity={0.5}
              fontSize="8"
            >
              {b.label}
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          points={track
            .map((p, i) => `${xAt(i)},${yAt(p.maxWindKt)}`)
            .join(" ")}
        />
      </svg>
    </div>
  );
}

export function TropicalDeskPanel({
  summary,
  nurseryLat,
  nurseryLng,
}: {
  summary: TropicalSummaryData;
  nurseryLat: number;
  nurseryLng: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const stormGroup = useRef<L.LayerGroup | null>(null);
  const coneGroup = useRef<L.LayerGroup | null>(null);
  const alertGroup = useRef<L.LayerGroup | null>(null);
  const spaghettiGroup = useRef<L.LayerGroup | null>(null);
  const radarLayer = useRef<L.TileLayer | null>(null);

  const [gis, setGis] = useState<NhcGisLayers | null>(null);
  const [adecks, setAdecks] = useState<ParsedAdeck[]>([]);
  const [toggles, setToggles] = useState<LayerToggles>({
    cone: true,
    alerts: true,
    spaghetti: false,
    radar: false,
  });

  const atlanticStorms = useMemo(
    () => summary.storms.filter((s) => s.basin === "atlantic"),
    [summary.storms],
  );

  useEffect(() => {
    const el = mapRef.current;
    if (!el || mapInstance.current) return;
    const map = L.map(el, {
      center: [24, -70],
      zoom: 4,
      minZoom: 3,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" },
    ).addTo(map);
    stormGroup.current = L.layerGroup().addTo(map);
    coneGroup.current = L.layerGroup().addTo(map);
    alertGroup.current = L.layerGroup().addTo(map);
    spaghettiGroup.current = L.layerGroup();
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
      stormGroup.current = null;
      coneGroup.current = null;
      alertGroup.current = null;
      spaghettiGroup.current = null;
      radarLayer.current = null;
    };
  }, []);

  // Official NHC GIS layers (CORS-friendly GeoJSON) + on-chain a-decks.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [layers, rawAdecks] = await Promise.all([
        fetchNhcGisLayers(),
        fetchTropicalAdecks(),
      ]);
      if (cancelled) return;
      setGis(layers);
      const parsed: ParsedAdeck[] = [];
      for (const a of rawAdecks) {
        const p = parseAdeckGz(a.gz, a.wallet, a.stormName);
        if (p) parsed.push(p);
      }
      setAdecks(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, [summary.fetchedAt]);

  // Backend-certified storm markers + forecast points.
  useEffect(() => {
    const map = mapInstance.current;
    const group = stormGroup.current;
    if (!map || !group) return;
    group.clearLayers();

    L.circleMarker([nurseryLat, nurseryLng], {
      radius: 7,
      color: "#e8a838",
      fillColor: "#e8a838",
      fillOpacity: 0.9,
      weight: 2,
    })
      .bindTooltip("IC SPICY Nursery", { permanent: false })
      .addTo(group);

    // Official GIS track supersedes the derived red polyline when present.
    const hasOfficialTrack =
      (gis?.forecastTrack?.features?.length ?? 0) > 0;

    for (const st of summary.storms) {
      const color = stormColor(st.maxWindKt);
      if (st.track.length > 1) {
        L.polyline(
          st.track.map((p) => [p.lat, p.lng] as [number, number]),
          { color, weight: 2, dashArray: "6 4", opacity: 0.7 },
        ).addTo(group);
      }
      const forecast = st.forecastTrack ?? [];
      if (forecast.length > 0) {
        if (!hasOfficialTrack) {
          L.polyline(
            [
              [st.lat, st.lng],
              ...forecast.map((p) => [p.lat, p.lng] as [number, number]),
            ],
            { color: "#ef4444", weight: 2.5, opacity: 0.85 },
          ).addTo(group);
        }
        for (const fp of forecast) {
          L.circleMarker([fp.lat, fp.lng], {
            radius: 4,
            color,
            fillColor: color,
            fillOpacity: 0.8,
            weight: 1,
          })
            .bindTooltip(
              `${st.name} +${fp.forecastHour}h · ${ktToMph(fp.maxWindKt)} mph`,
              { permanent: false },
            )
            .addTo(group);
        }
      }
      L.circleMarker([st.lat, st.lng], {
        radius: 10,
        color: "#fff",
        fillColor: color,
        fillOpacity: 0.95,
        weight: 2,
      })
        .bindTooltip(`${st.classification} ${st.name} · ${st.maxWindKt} kt`, {
          permanent: false,
        })
        .addTo(group);
    }

    for (const o of summary.developmentOutlooks ?? []) {
      L.circleMarker([o.centroidLat, o.centroidLng], {
        radius: 14,
        color:
          o.risk7Day === "HIGH"
            ? "#ef4444"
            : o.risk7Day === "MEDIUM"
              ? "#f97316"
              : "#eab308",
        fillColor: "transparent",
        weight: 2,
        dashArray: "4 4",
      })
        .bindTooltip(`${probText(o.prob7Day)}% · ${o.risk7Day} risk`, {
          permanent: false,
        })
        .addTo(group);
    }
  }, [summary, nurseryLat, nurseryLng, gis]);

  // Cone of uncertainty + official forecast track + past track.
  useEffect(() => {
    const group = coneGroup.current;
    if (!group) return;
    group.clearLayers();
    if (!gis) return;

    if (gis.cone) {
      L.geoJSON(gis.cone, {
        style: {
          color: "#ffffff",
          weight: 1.5,
          opacity: 0.8,
          fillColor: "#ffffff",
          fillOpacity: 0.12,
        },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.stormname;
          if (name) {
            layer.bindTooltip(`${name} — cone of uncertainty`, {
              sticky: true,
            });
          }
        },
      }).addTo(group);
    }
    if (gis.pastTrack) {
      L.geoJSON(gis.pastTrack, {
        style: {
          color: "#94a3b8",
          weight: 1.5,
          opacity: 0.7,
          dashArray: "4 4",
        },
      }).addTo(group);
    }
    if (gis.forecastTrack) {
      L.geoJSON(gis.forecastTrack, {
        style: { color: "#ffffff", weight: 2.5, opacity: 0.95 },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.stormname;
          if (name) {
            layer.bindTooltip(`${name} — official NHC track`, {
              sticky: true,
            });
          }
        },
      }).addTo(group);
    }
  }, [gis]);

  // Coastal watches and warnings.
  useEffect(() => {
    const group = alertGroup.current;
    if (!group) return;
    group.clearLayers();
    if (!gis?.watchWarning) return;
    L.geoJSON(gis.watchWarning, {
      style: (feature) => {
        const code = String(feature?.properties?.tcww ?? "");
        return {
          color: TCWW_STYLES[code]?.color ?? "#94a3b8",
          weight: 4,
          opacity: 0.9,
        };
      },
      onEachFeature: (feature, layer) => {
        const code = String(feature.properties?.tcww ?? "");
        const label = TCWW_STYLES[code]?.label ?? code;
        const name = feature.properties?.stormname;
        layer.bindTooltip(name ? `${label} — ${name}` : label, {
          sticky: true,
        });
      },
    }).addTo(group);
  }, [gis]);

  // Spaghetti models from on-chain a-decks.
  useEffect(() => {
    const group = spaghettiGroup.current;
    if (!group) return;
    group.clearLayers();
    for (const deck of adecks) {
      for (const model of deck.models) {
        const latlngs = model.points.map(
          (p) => [p.lat, p.lng] as [number, number],
        );
        const line = L.polyline(latlngs, {
          color: model.color,
          weight: model.isEnsembleMember ? 1 : model.tech === "OFCL" ? 3 : 1.8,
          opacity: model.isEnsembleMember ? 0.25 : 0.85,
        });
        if (!model.isEnsembleMember) {
          line.bindTooltip(
            `${model.label} · ${deck.stormName} · init ${formatInitTime(model.initTime)}`,
            { sticky: true },
          );
        }
        line.addTo(group);
      }
    }
  }, [adecks]);

  // Layer visibility toggles.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const sync = (group: L.LayerGroup | null, on: boolean) => {
      if (!group) return;
      if (on && !map.hasLayer(group)) group.addTo(map);
      if (!on && map.hasLayer(group)) map.removeLayer(group);
    };
    sync(coneGroup.current, toggles.cone);
    sync(alertGroup.current, toggles.alerts);
    sync(spaghettiGroup.current, toggles.spaghetti);
  }, [toggles]);

  // Radar overlay — latest RainViewer frame, fetched on first enable.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (!toggles.radar) {
      if (radarLayer.current && map.hasLayer(radarLayer.current)) {
        map.removeLayer(radarLayer.current);
      }
      return;
    }
    if (radarLayer.current) {
      radarLayer.current.addTo(map);
      return;
    }
    let cancelled = false;
    void (async () => {
      const data = await fetchRainViewerRadarData();
      if (cancelled || !data || !mapInstance.current) return;
      const frame = data.frames[data.liveFrameIndex] ?? data.frames.at(-1);
      if (!frame) return;
      const tiles = L.tileLayer(
        buildRainViewerTileTemplate(data.host, frame.path),
        { opacity: 0.6, maxZoom: 12 },
      );
      radarLayer.current = tiles;
      tiles.addTo(mapInstance.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [toggles.radar]);

  const namedModels = useMemo(() => {
    const seen = new Map<string, { label: string; color: string }>();
    for (const deck of adecks) {
      for (const m of deck.models) {
        if (!m.isEnsembleMember && !seen.has(m.tech)) {
          seen.set(m.tech, { label: m.label, color: m.color });
        }
      }
    }
    return [...seen.values()];
  }, [adecks]);

  const activeAlertCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const f of gis?.watchWarning?.features ?? []) {
      const code = String(
        (f.properties as Record<string, unknown> | null)?.tcww ?? "",
      );
      if (code in TCWW_STYLES) codes.add(code);
    }
    return [...codes];
  }, [gis]);

  return (
    <div data-ocid="tropical-desk-panel" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            Tropical desk
          </h2>
          <p className="text-sm text-[var(--wd-muted)]">
            {summary.seasonActive
              ? "Hurricane season active · Atlantic & Pacific"
              : "Off-season monitoring"}{" "}
            · Source: {summary.dataSource ?? "on-chain"}
          </p>
        </div>
        <a
          href="https://www.nhc.noaa.gov/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--wd-citrus)] underline-offset-2 hover:underline"
        >
          Official NHC →
        </a>
      </div>

      {atlanticStorms.map((st) => (
        <AdvisoryCard key={st.id} storm={st} />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        {TOGGLE_LABELS.map(({ key, label }) => {
          const disabled = key === "spaghetti" && adecks.length === 0;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() =>
                setToggles((t) => ({ ...t, [key]: !t[key] }))
              }
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                toggles[key]
                  ? "border-[var(--wd-citrus,#e8a838)] bg-[var(--wd-citrus,#e8a838)]/20 text-[var(--wd-citrus,#e8a838)]"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
              } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {label}
              {key === "spaghetti" && adecks.length === 0 ? " (n/a)" : ""}
            </button>
          );
        })}
      </div>

      <div
        ref={mapRef}
        className="h-80 w-full overflow-hidden rounded-xl border border-white/10 sm:h-96"
        aria-label="Tropical systems map"
      />

      {(toggles.alerts && activeAlertCodes.length > 0) ||
      (toggles.spaghetti && namedModels.length > 0) ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-white/10 bg-[#0a1628]/80 px-3 py-2">
          {toggles.alerts &&
            activeAlertCodes.map((code) => (
              <span
                key={code}
                className="flex items-center gap-1.5 text-[10px] text-white/70"
              >
                <span
                  className="inline-block h-1 w-5 rounded-full"
                  style={{ backgroundColor: TCWW_STYLES[code].color }}
                />
                {TCWW_STYLES[code].label}
              </span>
            ))}
          {toggles.spaghetti &&
            namedModels.map((m) => (
              <span
                key={m.label}
                className="flex items-center gap-1.5 text-[10px] text-white/70"
              >
                <span
                  className="inline-block h-0.5 w-5"
                  style={{ backgroundColor: m.color }}
                />
                {m.label}
              </span>
            ))}
          {toggles.spaghetti && adecks.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-white/50">
              <span className="inline-block h-px w-5 bg-slate-400/50" />
              GFS ensemble (30)
            </span>
          )}
        </div>
      ) : null}

      {hasAnyGisData(
        gis ?? {
          forecastTrack: null,
          cone: null,
          watchWarning: null,
          pastTrack: null,
        },
      ) && (
        <p className="text-[10px] text-white/40">
          Cone, official track & watch/warning geometry: NOAA/NHC MapServer.
          Spaghetti tracks: ATCF a-decks mirrored on-chain
          {adecks[0] ? ` (init ${formatInitTime(adecks[0].initTime)})` : ""}.
        </p>
      )}

      {(summary.developmentOutlooks?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-white/10 bg-[#0a1628]/80 p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">
            Tropical weather outlook
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.developmentOutlooks!.map((o, i) => (
              <span
                key={`${o.basin}-${i}`}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  o.risk7Day === "HIGH"
                    ? "bg-red-500/25 text-red-200"
                    : o.risk7Day === "MEDIUM"
                      ? "bg-orange-500/25 text-orange-200"
                      : "bg-yellow-500/20 text-yellow-100"
                }`}
              >
                {o.basin}: {probText(o.prob7Day)}% ({o.risk7Day})
              </span>
            ))}
          </div>
        </div>
      )}

      <AceSeasonPanel summary={summary} />

      {atlanticStorms[0] && <IntensityChart storm={atlanticStorms[0]} />}

      <p className="max-w-2xl text-xs leading-relaxed text-[var(--wd-muted)]">
        {summary.disclaimer}
      </p>
    </div>
  );
}
