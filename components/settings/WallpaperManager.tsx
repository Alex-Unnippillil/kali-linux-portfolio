"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "../../hooks/useSettings";

async function calculateLuminance(src: string): Promise<number> {
  const response = await fetch(src);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.drawImage(bitmap, 0, 0, 1, 1);
  const { data } = ctx.getImageData(0, 0, 1, 1);
  const [r, g, b] = data;
  const toLinear = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export default function WallpaperManager() {
  const { wallpaper, highContrast, setHighContrast } = useSettings();
  const cache = useRef<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const analyze = async () => {
      let lum = cache.current[wallpaper];
      if (lum === undefined) {
        lum = await calculateLuminance(`/wallpapers/${wallpaper}.webp`);
        cache.current[wallpaper] = lum;
      }
      if (!active) return;
      const contrast = 1.05 / (lum + 0.05);
      const shouldHighContrast = contrast < 4.5;
      if (shouldHighContrast !== highContrast) {
        setHighContrast(shouldHighContrast);
      }
    };
    analyze().catch((err) => console.error("Wallpaper analysis failed", err));
    return () => {
      active = false;
    };
  }, [wallpaper, highContrast, setHighContrast]);

  return null;
}

