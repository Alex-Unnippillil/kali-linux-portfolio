"use client";

import { useEffect, useRef, useState } from "react";
import slidesData from "@/content/kali-tour.json";

interface Slide {
  title: string;
  description: string;
}

const slides: Slide[] = slidesData as Slide[];

export default function TourCarousel() {
  const [index, setIndex] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      setIndex((i) => (i + 1) % slides.length);
    } else if (e.key === "ArrowLeft") {
      setIndex((i) => (i - 1 + slides.length) % slides.length);
    }
  };

  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = slides[index].title;
    }
  }, [index]);

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKey}
      aria-roledescription="carousel"
      aria-label="Kali Linux tour"
      className="flex flex-col items-center"
    >
      <div ref={liveRef} aria-live="polite" className="sr-only" />
      <h2 className="text-xl font-bold">{slides[index].title}</h2>
      <p className="mt-2 text-center max-w-lg">{slides[index].description}</p>
      <div className="mt-4 text-sm text-gray-500">
        {index + 1} / {slides.length}
      </div>
    </div>
  );
}
