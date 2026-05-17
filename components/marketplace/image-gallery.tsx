"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ImageGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const list = images.length ? images : ["/placeholder.svg"];
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden glass">
        <Image
          src={list[active]}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          priority
        />
        {list.length > 1 && (
          <>
            <button
              onClick={() => setActive((i) => (i - 1 + list.length) % list.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-9 grid place-items-center rounded-full glass-strong"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setActive((i) => (i + 1) % list.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-9 grid place-items-center rounded-full glass-strong"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              className={cn(
                "relative size-20 rounded-xl overflow-hidden shrink-0 transition",
                active === i
                  ? "ring-2 ring-primary"
                  : "ring-1 ring-white/10 opacity-70 hover:opacity-100",
              )}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
