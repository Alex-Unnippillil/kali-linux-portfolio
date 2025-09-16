"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import BackgroundSlideshow from "../components/BackgroundSlideshow";
import { ACCENT_OPTIONS, useSettings } from "../../../hooks/useSettings";
import usePersistentState from "../../../hooks/usePersistentState";
import {
  getWallpaperUrl,
  isCustomWallpaper,
  isSameWallpaper,
} from "../../../utils/wallpaper";
import {
  BUILTIN_WALLPAPERS,
  WallpaperOption,
} from "./wallpapers";
import { areColorsSimilar, useAccentPalette } from "./useAccentPalette";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/avif",
];

const MAX_UPLOAD_SIZE = 6 * 1024 * 1024; // 6MB
const MAX_CUSTOM_WALLPAPERS = 6;
const CUSTOM_WALLPAPERS_KEY = "custom-wallpapers";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

interface AccentSwatchProps {
  color: string;
  label: string;
  onSelect: (color: string) => void;
  selected: boolean;
  variant?: "preset" | "suggested";
}

function AccentSwatch({
  color,
  label,
  onSelect,
  selected,
  variant = "preset",
}: AccentSwatchProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={() => onSelect(color)}
      className={`relative h-9 w-9 rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        selected
          ? "border-white shadow-lg"
          : "border-transparent hover:scale-105 hover:border-white/40"
      } ${variant === "suggested" ? "ring-1 ring-white/30" : ""}`}
      style={{ backgroundColor: color }}
    >
      <span className="sr-only">{label}</span>
    </button>
  );
}

interface WallpaperGridProps {
  options: WallpaperOption[];
  selected: string;
  active: string;
  onSelect: (value: string) => void;
  onPreview: (value: string | null) => void;
}

function WallpaperGrid({
  options,
  selected,
  active,
  onSelect,
  onPreview,
}: WallpaperGridProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wide text-ubt-cool-grey">
          Wallpapers
        </h3>
        <span className="text-xs text-ubt-cool-grey/70">Hover to preview</span>
      </div>
      <div
        role="radiogroup"
        aria-label="Desktop wallpapers"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {options.map((option) => {
          const isSelected = isSameWallpaper(option.value, selected);
          const isActive = isSameWallpaper(option.value, active);
          return (
            <button
              key={`${option.type}-${option.id}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option.value)}
              onMouseEnter={() => onPreview(option.value)}
              onFocus={() => onPreview(option.value)}
              onMouseLeave={() => onPreview(null)}
              onBlur={() => onPreview(null)}
              className={`relative aspect-video overflow-hidden rounded-lg border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                isSelected
                  ? "border-white shadow-lg ring-2 ring-ub-orange/80"
                  : isActive
                    ? "border-white/60 shadow"
                    : "border-transparent hover:border-white/40 hover:shadow"
              }`}
            >
              <span className="sr-only">Select {option.label}</span>
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${option.src})` }}
              />
              <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs font-medium text-white">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface WallpaperPreviewProps {
  src: string;
  accent: string;
  label: string;
}

function WallpaperPreview({ src, accent, label }: WallpaperPreviewProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-ubt-cool-grey">
        Desktop preview
      </h2>
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-gray-900 bg-black/50 shadow-xl">
        <div className="relative aspect-video">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${src})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-black/45" />
          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-black/60 p-4 text-white backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide">
              <span className="flex items-center gap-2 normal-case">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-white/50"
                  style={{ backgroundColor: accent }}
                />
                Accent preview
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[0.65rem] normal-case">
                {label}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <div
                className="h-12 flex-1 rounded-md border border-white/20 bg-white/10"
                aria-hidden="true"
              >
                <div
                  className="h-full w-1/3 rounded-l-md"
                  style={{
                    backgroundColor: accent,
                    opacity: 0.45,
                  }}
                />
              </div>
              <div className="flex h-12 w-24 flex-col justify-between text-[0.6rem] uppercase tracking-wide text-white/70">
                <span>Window</span>
                <span className="text-right">Controls</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AppearanceTab() {
  const { accent, setAccent, wallpaper, setWallpaper } = useSettings();
  const [customWallpapers, setCustomWallpapers] = usePersistentState<string[]>(
    CUSTOM_WALLPAPERS_KEY,
    [],
    isStringArray,
  );
  const [error, setError] = useState<string | null>(null);
  const [hoveredWallpaper, setHoveredWallpaper] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      isCustomWallpaper(wallpaper) &&
      !customWallpapers.includes(wallpaper)
    ) {
      setCustomWallpapers((prev) => {
        const filtered = prev.filter((entry) => entry !== wallpaper);
        return [wallpaper, ...filtered].slice(0, MAX_CUSTOM_WALLPAPERS);
      });
    }
  }, [wallpaper, customWallpapers, setCustomWallpapers]);

  const activeWallpaper = hoveredWallpaper ?? wallpaper;
  const previewSrc = getWallpaperUrl(activeWallpaper);
  const palette = useAccentPalette(previewSrc, 6);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const colors: string[] = [];
    palette.forEach((color) => {
      const normalized = color.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      if (!ACCENT_OPTIONS.some((preset) => areColorsSimilar(preset, color))) {
        colors.push(color);
      }
    });
    return colors;
  }, [palette]);

  const wallpaperOptions = useMemo(() => {
    const customEntries: WallpaperOption[] = customWallpapers.map((src, index) => ({
      id: `custom-${index}`,
      label: `Custom ${index + 1}`,
      value: src,
      src,
      type: "custom" as const,
    }));
    const builtin = BUILTIN_WALLPAPERS;
    const combined: WallpaperOption[] = [...customEntries, ...builtin];
    if (
      wallpaper &&
      !combined.some((option) => isSameWallpaper(option.value, wallpaper))
    ) {
      combined.unshift({
        id: "current",
        label: "Current wallpaper",
        value: wallpaper,
        src: getWallpaperUrl(wallpaper),
        type: isCustomWallpaper(wallpaper) ? "custom" : "current",
      });
    }
    return combined;
  }, [customWallpapers, wallpaper]);

  const activeLabel = useMemo(() => {
    const match = wallpaperOptions.find((option) =>
      isSameWallpaper(option.value, activeWallpaper),
    );
    return match ? match.label : "Wallpaper";
  }, [wallpaperOptions, activeWallpaper]);

  const handleWallpaperSelect = (value: string) => {
    setError(null);
    setHoveredWallpaper(null);
    setWallpaper(value);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!file.type || !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setError("Image must be smaller than 6MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.startsWith("data:image")) {
        setError("Unsupported image format.");
        return;
      }
      setCustomWallpapers((prev) => {
        const filtered = prev.filter((entry) => entry !== result);
        return [result, ...filtered].slice(0, MAX_CUSTOM_WALLPAPERS);
      });
      setHoveredWallpaper(null);
      setWallpaper(result);
    };
    reader.onerror = () => setError("Failed to read the selected file.");
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 px-4 py-6 text-ubt-grey">
      <WallpaperPreview src={previewSrc} accent={accent} label={activeLabel} />

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-ubt-cool-grey">
          Accent color
        </h3>
        <p className="text-xs text-ubt-cool-grey/80">
          Pick a highlight color or try one sampled from your wallpaper.
        </p>
        <div
          role="radiogroup"
          aria-label="Accent colors"
          className="flex flex-wrap gap-2"
        >
          {ACCENT_OPTIONS.map((color) => (
            <AccentSwatch
              key={`preset-${color}`}
              color={color}
              label={`Accent color ${color}`}
              selected={accent === color}
              onSelect={setAccent}
            />
          ))}
          {suggestions.map((color) => (
            <AccentSwatch
              key={`suggested-${color}`}
              color={color}
              label={`Suggested accent color ${color}`}
              selected={accent === color}
              onSelect={setAccent}
              variant="suggested"
            />
          ))}
        </div>
        {suggestions.length > 0 && (
          <p className="text-xs text-ubt-cool-grey/70">
            Suggestions refresh automatically when you preview different wallpapers.
          </p>
        )}
      </section>

      <WallpaperGrid
        options={wallpaperOptions}
        selected={wallpaper}
        active={activeWallpaper}
        onSelect={handleWallpaperSelect}
        onPreview={setHoveredWallpaper}
      />

      <section className="overflow-hidden rounded-lg border border-gray-900 bg-black/20">
        <div className="border-b border-gray-900 px-4 py-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-ubt-cool-grey">
            Custom wallpaper
          </h3>
          <p className="text-xs text-ubt-cool-grey/70">
            Upload PNG, JPG, WebP, or AVIF up to 6MB.
          </p>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-ubt-cool-grey/80">
            <p>Custom uploads are stored locally for this browser.</p>
          </div>
          <button
            type="button"
            onClick={openFilePicker}
            className="rounded bg-ub-orange px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Upload image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload custom wallpaper"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-900 bg-black/20">
        <div className="border-b border-gray-900 px-4 py-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-ubt-cool-grey">
            Background slideshow
          </h3>
          <p className="text-xs text-ubt-cool-grey/70">
            Rotate through multiple wallpapers automatically.
          </p>
        </div>
        <BackgroundSlideshow />
      </section>
    </div>
  );
}
