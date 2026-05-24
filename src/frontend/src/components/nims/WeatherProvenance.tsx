import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildWeatherHistory,
  weatherHistorySummary,
} from "@/lib/weather-history";
import type { PlantLifecycle } from "../../declarations/backend.did";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export function WeatherProvenance({
  lifecycle,
  tokenId,
}: {
  lifecycle: PlantLifecycle;
  tokenId: bigint;
}) {
  const points = useMemo(() => buildWeatherHistory(lifecycle, "all"), [lifecycle]);
  const summary = useMemo(() => weatherHistorySummary(points), [points]);

  const miniData = useMemo(
    () =>
      points.map((p) => ({
        label: p.date.slice(5),
        highF: p.highF,
        rainInches: p.rainInches,
      })),
    [points],
  );

  const plantId = lifecycle.plant.id;

  return (
    <Card className="border-border bg-card" data-ocid="nft-weather-provenance">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-bold">
          Provenance Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Weather provenance will appear as lifecycle entries are logged for this
            plant.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              This plant experienced{" "}
              <span className="font-medium text-foreground">
                {summary.days} days
              </span>{" "}
              of weather data, average temp{" "}
              <span className="font-medium text-foreground">
                {summary.avgTempF.toFixed(0)}°F
              </span>
              , total rainfall{" "}
              <span className="font-medium text-foreground">
                {summary.totalRainInches.toFixed(2)} inches
              </span>
              .
            </p>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={miniData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="temp" tick={{ fontSize: 9 }} unit="°" width={32} />
                  <YAxis
                    yAxisId="rain"
                    orientation="right"
                    tick={{ fontSize: 9 }}
                    width={28}
                  />
                  <Area
                    yAxisId="temp"
                    type="monotone"
                    dataKey="highF"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.12}
                    strokeWidth={1.5}
                  />
                  <Bar
                    yAxisId="rain"
                    dataKey="rainInches"
                    fill="#3b82f6"
                    fillOpacity={0.5}
                    barSize={6}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link
            to="/plant/$plantId"
            params={{ plantId: plantId.toString() }}
            data-ocid="nft-view-lifecycle-link"
          >
            View full lifecycle →
          </Link>
        </Button>
        <p className="text-[10px] text-muted-foreground font-mono">
          Linked NFT #{tokenId.toString()} · Plant #{plantId.toString()}
        </p>
      </CardContent>
    </Card>
  );
}
