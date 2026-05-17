"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CONDITIONS } from "@/lib/constants";
import type { Category } from "@/types/database";

export function FilterBar({
  categories,
  currentCategory,
  currentCondition,
  currentSort,
}: {
  categories: Category[];
  currentCategory?: string;
  currentCondition?: string;
  currentSort?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string | undefined) {
    const params = new URLSearchParams(sp.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="h-8 px-3">
        <SlidersHorizontal className="size-3.5 mr-1" /> Filter
      </Badge>

      <Select
        value={currentCategory ?? "all"}
        onValueChange={(v) => update("category", v)}
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.slug}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentCondition ?? "all"}
        onValueChange={(v) => update("condition", v)}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any condition</SelectItem>
          {CONDITIONS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSort ?? "new"}
        onValueChange={(v) => update("sort", v)}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">Newest</SelectItem>
          <SelectItem value="price_asc">Price: low → high</SelectItem>
          <SelectItem value="price_desc">Price: high → low</SelectItem>
          <SelectItem value="featured">Featured first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
