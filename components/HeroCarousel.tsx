import { useCallback, useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

interface HeroCarouselProps {
  items: React.ReactNode[];
  autoPlay?: boolean;
  interval?: number;
  ariaLabel?: string;
}

export default function HeroCarousel({
  items,
  autoPlay = false,
  interval = 5000,
  ariaLabel = 'Hero carousel',
}: HeroCarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);
    const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          next();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prev();
        }
      };
      container.addEventListener('keydown', handleKey);
      return () => container.removeEventListener('keydown', handleKey);
    }, [next, prev]);

  useEffect(() => {
    if (!autoPlay || prefersReducedMotion) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(next, interval);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    }, [index, autoPlay, prefersReducedMotion, interval, next]);

  useEffect(() => {
    const active = containerRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.focus();
  }, [index]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let startX = 0;
    const onPointerDown = (e: PointerEvent) => {
      startX = e.clientX;
    };
    const onPointerUp = (e: PointerEvent) => {
      const diff = e.clientX - startX;
      if (Math.abs(diff) > 50) {
        if (diff < 0) next();
        else prev();
      }
    };
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
    };
    }, [next, prev]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className="relative overflow-hidden focus:outline-none"
    >
      {items.map((item, i) => (
        <div
          key={i}
          data-active={i === index}
          tabIndex={i === index ? 0 : -1}
          aria-hidden={i === index ? 'false' : 'true'}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${i + 1} of ${items.length}`}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'} ${prefersReducedMotion ? '!transition-none' : ''}`}
        >
          {item}
        </div>
      ))}
      <button
        type="button"
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 focus:outline-none"
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-800/70 text-white p-2 focus:outline-none"
        aria-label="Next slide"
      >
        ›
      </button>
    </div>
  );
}

