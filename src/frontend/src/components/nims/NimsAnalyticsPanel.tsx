import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PlantLifecycle } from "@/declarations/backend.did";
import {
  NIMS_CHART_COLORS,
  aggregateNimsAnalytics,
} from "@/lib/nims-analytics";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const STAGE_COLORS = [
  NIMS_CHART_COLORS.green,
  NIMS_CHART_COLORS.blue,
  NIMS_CHART_COLORS.purple,
  NIMS_CHART_COLORS.amber,
  NIMS_CHART_COLORS.gray,
];

export function NimsAnalyticsPanel({
  plants,
}: {
  plants: PlantLifecycle[];
}) {
  const analytics = useMemo(() => aggregateNimsAnalytics(plants), [plants]);

  if (plants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No plant data yet — add plants to see analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="nims-analytics-panel">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Plants", value: analytics.totalPlants },
          { label: "Varieties", value: analytics.totalVarieties },
          {
            label: "Germination Rate",
            value: `${analytics.germinationRate}%`,
          },
          { label: "Plants Sold", value: analytics.plantsSold },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-display font-semibold mt-1">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-semibold mb-3">Plants by Stage</h3>
          <ChartContainer
            config={{
              count: { label: "Plants", color: NIMS_CHART_COLORS.green },
            }}
            className="h-[220px] w-full"
          >
            <PieChart>
              <Pie
                data={analytics.plantsByStage}
                dataKey="count"
                nameKey="stage"
                innerRadius={50}
                outerRadius={80}
              >
                {analytics.plantsByStage.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-semibold mb-3">Top Varieties</h3>
          <ChartContainer
            config={{
              count: { label: "Plants", color: NIMS_CHART_COLORS.amber },
            }}
            className="h-[220px] w-full"
          >
            <BarChart
              data={analytics.plantsByVariety}
              layout="vertical"
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="variety"
                width={100}
                tick={{ fontSize: 10 }}
              />
              <Bar dataKey="count" fill={NIMS_CHART_COLORS.amber} radius={4} />
              <ChartTooltip content={<ChartTooltipContent />} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-3">
          Germination Rate by Variety
        </h3>
        <ChartContainer
          config={{
            rate: { label: "Rate %", color: NIMS_CHART_COLORS.green },
          }}
          className="h-[240px] w-full"
        >
          <BarChart data={analytics.germinationByVariety}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="variety"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Bar dataKey="rate" fill={NIMS_CHART_COLORS.green} radius={4} />
            <ChartTooltip content={<ChartTooltipContent />} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-3">
          Activity (last 30 days)
        </h3>
        <ChartContainer
          config={{
            waterings: { label: "Waterings", color: NIMS_CHART_COLORS.blue },
            feedings: { label: "Feedings", color: NIMS_CHART_COLORS.green },
            photos: { label: "Photos", color: NIMS_CHART_COLORS.amber },
          }}
          className="h-[240px] w-full"
        >
          <AreaChart data={analytics.dailyActivity}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9 }}
              tickFormatter={(v) => String(v).slice(5)}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Area
              type="monotone"
              dataKey="waterings"
              stackId="a"
              stroke={NIMS_CHART_COLORS.blue}
              fill={NIMS_CHART_COLORS.blue}
              fillOpacity={0.35}
            />
            <Area
              type="monotone"
              dataKey="feedings"
              stackId="a"
              stroke={NIMS_CHART_COLORS.green}
              fill={NIMS_CHART_COLORS.green}
              fillOpacity={0.35}
            />
            <Area
              type="monotone"
              dataKey="photos"
              stackId="a"
              stroke={NIMS_CHART_COLORS.amber}
              fill={NIMS_CHART_COLORS.amber}
              fillOpacity={0.35}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-display font-semibold mb-3">
          Container Distribution
        </h3>
        <ChartContainer
          config={{
            count: { label: "Plants", color: NIMS_CHART_COLORS.purple },
          }}
          className="h-[220px] w-full"
        >
          <PieChart>
            <Pie
              data={analytics.plantsByContainer}
              dataKey="count"
              nameKey="container"
              outerRadius={80}
            >
              {analytics.plantsByContainer.map((_, i) => (
                <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}
