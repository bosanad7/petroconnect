"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface Point {
  day: string;
  users: number;
  listings: number;
}

export default function AnalyticsChartInner({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="users" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3870ff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#3870ff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="listings" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#42d4f4" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#42d4f4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="day"
            stroke="rgba(255,255,255,0.5)"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            allowDecimals={false}
            stroke="rgba(255,255,255,0.5)"
            tick={{ fontSize: 11 }}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15,29,54,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="users"
            stroke="#3870ff"
            fill="url(#users)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="listings"
            stroke="#42d4f4"
            fill="url(#listings)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
