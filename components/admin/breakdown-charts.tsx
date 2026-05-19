"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const LazyInner = dynamic(() => import("./breakdown-charts-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid lg:grid-cols-2 gap-4">
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
    </div>
  ),
});

export interface ByName {
  name: string;
  count: number;
}
export interface SalesByCompany {
  name: string;
  total_kwd: number;
  trades: number;
}

export function BreakdownCharts(props: {
  byCategory: ByName[];
  byCompany: ByName[];
  salesByCompany: SalesByCompany[];
}) {
  return <LazyInner {...props} />;
}
