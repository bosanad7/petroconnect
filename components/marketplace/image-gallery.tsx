"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
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
  const [direction, setDirection] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  function go(delta: 1 | -1) {
    setDirection(delta);
    setActive((i) => (i + delta + list.length) % list.length);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-muted border border-border group">
          <AnimatePresence custom={direction} mode="popLayout" initial={false}>
            <motion.div
              key={active}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30, scale: 1.02 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -direction * 30, scale: 1.02 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={list[active]}
                alt={alt}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
                priority
              />
            </motion.div>
          </AnimatePresence>

          {list.length > 1 && (
            <>
              <NavButton
                direction="prev"
                onClick={() => go(-1)}
                className="left-3"
              />
              <NavButton
                direction="next"
                onClick={() => go(1)}
                className="right-3"
              />
            </>
          )}

          <button
            onClick={() => setLightbox(true)}
            className="absolute top-3 right-3 size-9 grid place-items-center rounded-full bg-white/95 backdrop-blur border border-white/95 text-foreground shadow-sm hover:bg-white transition opacity-0 group-hover:opacity-100"
            aria-label="Expand image"
          >
            <Maximize2 className="size-4" />
          </button>

          {list.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur border border-white/95 text-[11px] text-foreground tabular-nums shadow-sm">
              {active + 1} / {list.length}
            </div>
          )}
        </div>

        {list.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {list.map((src, i) => (
              <button
                key={src + i}
                onClick={() => {
                  setDirection(i > active ? 1 : -1);
                  setActive(i);
                }}
                className={cn(
                  "relative size-20 rounded-xl overflow-hidden shrink-0 transition-all duration-300 bg-muted",
                  active === i
                    ? "ring-2 ring-primary scale-100"
                    : "ring-1 ring-border opacity-70 hover:opacity-100 hover:scale-[1.03]",
                )}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/85 backdrop-blur-xl grid place-items-center p-6"
            onClick={() => setLightbox(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-5xl aspect-[4/3]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={list[active]}
                alt={alt}
                fill
                className="object-contain"
                sizes="100vw"
              />
              <button
                onClick={() => setLightbox(false)}
                className="absolute -top-2 -right-2 size-10 grid place-items-center rounded-full bg-card border border-border shadow-md"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavButton({
  direction,
  onClick,
  className,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className?: string;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 size-10 grid place-items-center rounded-full bg-white/95 backdrop-blur border border-white/95 text-foreground shadow-sm",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "hover:bg-white hover:scale-[1.05] transition-transform",
        className,
      )}
      aria-label={direction === "prev" ? "Previous" : "Next"}
    >
      <Icon className="size-4" />
    </button>
  );
}
