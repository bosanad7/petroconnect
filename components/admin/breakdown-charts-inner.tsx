"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface ByName {
  name: string;
  count: number;
}
interface SalesByCompany {
  name: string;
  total_kwd: number;
  trades: number;
}

const PIE_COLORS = [
  "#FF6A00",
  "#FF8533",
  "#FFB37A",
  "#3870FF",
  "#1FB7A7",
  "#A855F7",
  "#F472B6",
  "#94A3B8",
];

export default function BreakdownChartsInner({
  byCategory,
  byCompany,
  salesByCompany,
}: {
  byCategory: ByName[];
  byCompany: ByName[];
  salesByCompany: SalesByCompany[];
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Listings by category</h3>
          <div className="h-72">
            {byCategory.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <Legend rows={byCategory} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Members by K-Company</h3>
          <div className="h-72">
            {byCompany.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer>
                <BarChart data={byCompany} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#FF6A00"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">Sales by K-Company (KWD)</h3>
          <div className="h-72">
            {salesByCompany.length === 0 ? (
              <Empty hint="No transactions yet." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={salesByCompany}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="total_kwd"
                    fill="#3870FF"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ hint = "No data yet." }: { hint?: string }) {
  return (
    <div className="h-full grid place-items-center text-xs text-muted-foreground">
      {hint}
    </div>
  );
}

function Legend({ rows }: { rows: ByName[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-muted-foreground">
      {rows.map((r, i) => (
        <span key={r.name} className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
          />
          {r.name} · {r.count}
        </span>
      ))}
    </div>
  );
}
