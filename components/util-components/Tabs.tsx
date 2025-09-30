"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Tab<T extends string> = {
  id: T;
  label: string;
};

interface TabsProps<T extends string> {
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

const SCROLL_FRACTION = 0.6;

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: TabsProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const pointerActiveRef = useRef(false);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const handleScroll = () => updateScrollState();
    el.addEventListener("scroll", handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateScrollState());
      resizeObserver.observe(el);
    }

    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const delta = el.clientWidth * SCROLL_FRACTION;
    el.scrollBy({
      left: direction === "left" ? -delta : delta,
      behavior: "smooth",
    });
  }, []);

  const trimmedClassName = className.trim();
  const tokens = trimmedClassName ? trimmedClassName.split(/\s+/).filter(Boolean) : [];
  const tabListAugmentedTokens = tokens.filter((token) =>
    [
      "justify-",
      "items-",
      "content-",
      "self-",
      "place-",
      "gap-",
      "space-",
      "flex",
      "grow",
      "shrink",
      "basis-",
      "w-",
      "min-w",
      "max-w",
    ].some((prefix) => token.startsWith(prefix))
  );
  const rootClassName = ["relative", ...tokens].join(" ").trim();
  const tabListClassName = Array.from(
    new Set(
      [
        "flex",
        "gap-2",
        "overflow-x-auto",
        "scroll-smooth",
        "whitespace-nowrap",
        "px-8",
        ...tabListAugmentedTokens,
      ].filter(Boolean)
    )
  )
    .join(" ")
    .trim();

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;

    pointerActiveRef.current = true;
    isDraggingRef.current = false;
    suppressClickRef.current = false;
    dragStartX.current = event.clientX;
    dragStartScroll.current = el.scrollLeft;
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el && el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    pointerActiveRef.current = false;
    if (isDraggingRef.current) {
      suppressClickRef.current = true;
    }
    isDraggingRef.current = false;
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !pointerActiveRef.current) return;

    const deltaX = event.clientX - dragStartX.current;
    if (!isDraggingRef.current && Math.abs(deltaX) > 3) {
      isDraggingRef.current = true;
      el.setPointerCapture(event.pointerId);
    }

    if (!isDraggingRef.current) return;

    event.preventDefault();
    el.scrollLeft = dragStartScroll.current - deltaX;
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    endDrag(event);
    // Allow click suppression to clear after the event loop tick
    if (suppressClickRef.current) {
      requestAnimationFrame(() => {
        suppressClickRef.current = false;
      });
    }
  }, [endDrag]);

  return (
    <div className={rootClassName}>
      <button
        type="button"
        aria-label="Scroll tabs left"
        onClick={() => scrollBy("left")}
        className={`absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white transition-opacity focus:outline-none focus-visible:ring ${
          canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span aria-hidden>◀</span>
      </button>
      <div
        ref={scrollRef}
        role="tablist"
        aria-orientation="horizontal"
        className={tabListClassName}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            tabIndex={active === t.id ? 0 : -1}
            type="button"
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              onChange(t.id);
            }}
            className={`flex-shrink-0 rounded px-4 py-2 transition-colors focus:outline-none focus-visible:ring ${
              active === t.id
                ? "bg-ub-orange text-white"
                : "text-ubt-grey hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Scroll tabs right"
        onClick={() => scrollBy("right")}
        className={`absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white transition-opacity focus:outline-none focus-visible:ring ${
          canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span aria-hidden>▶</span>
      </button>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0a101f] via-[#0a101f]/80 to-transparent transition-opacity ${
          canScrollLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0a101f] via-[#0a101f]/80 to-transparent transition-opacity ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
