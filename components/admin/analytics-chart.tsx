"use client";

// Recharts is heavy (~80KB gzipped). Keeping this component in its own
// client-component file lets Next code-split it out of the shared admin
// route bundle without needing next/dynamic.

import AnalyticsChartInner from "./analytics-chart-inner";

interface Point {
  day: string;
  users: number;
  listings: number;
}

export function AnalyticsChart({ data }: { data: Point[] }) {
  return <AnalyticsChartInner data={data} />;
}
