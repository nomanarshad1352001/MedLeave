"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TOOLTIP_STYLE = {
  background: "var(--tooltip-bg)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "10px 14px",
  fontSize: 12,
  color: "var(--tooltip-fg)",
  boxShadow: "0 16px 40px -12px rgba(15,23,42,0.5)",
} as const;

export function MonthlyBars({
  data,
  height = 260,
}: {
  data: Array<{ label: string; completed: number; cancelled: number; target: number }>;
  height?: number;
}) {
  const avgTarget = data.length ? Math.round(data.reduce((a, d) => a + d.target, 0) / data.length) : 0;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
        <defs>
          <linearGradient id="barTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-bar-top)" />
            <stop offset="100%" stopColor="var(--chart-bar-bottom)" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.07)" strokeDasharray="3 6" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "rgba(15,23,42,0.5)", fontWeight: 600 }}
          dy={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "rgba(15,23,42,0.4)" }}
        />
        <Tooltip
          cursor={{ fill: "rgba(15,23,42,0.05)", radius: 8 }}
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ fontWeight: 700, marginBottom: 4 }}
          formatter={(value: any, name: any) => [
            `${value} sessions`,
            name === "completed" ? "Delivered" : "Cancelled",
          ]}
        />
        {avgTarget > 0 && (
          <ReferenceLine
            y={avgTarget}
            stroke="var(--pace-surplus)"
            strokeDasharray="6 5"
            strokeWidth={1.5}
            label={{ value: "pro-rata target", position: "insideTopRight", fontSize: 10, fill: "var(--color-amber-700)", fontWeight: 700 }}
          />
        )}
        <Bar dataKey="completed" fill="url(#barTeal)" radius={[6, 6, 2, 2]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UsageDonut({
  data,
  height = 230,
  centerLabel,
  centerValue,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={3}
            cornerRadius={6}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: any, name: any) => [`${value} days`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-medium text-slate-900">{centerValue}</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-700/60">{centerLabel}</span>
        </div>
      )}
    </div>
  );
}
