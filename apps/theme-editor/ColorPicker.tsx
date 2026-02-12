"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RGB = { r: number; g: number; b: number };

interface ContrastSample {
  label: string;
  color: string;
}

interface ColorPickerProps {
  /** Hex value for the selected color */
  value?: string;
  /** Alias for value to support existing call sites */
  color?: string;
  /** Optional opacity for the selected color (0 - 1) */
  alpha?: number;
  /** Called when a new color is chosen */
  onChange?: (hex: string) => void;
  /** Alias for onChange to avoid breaking consumers */
  onColorChange?: (hex: string) => void;
  /** Called when opacity changes */
  onAlphaChange?: (alpha: number) => void;
  /** Quick-select color swatches */
  swatches?: string[];
  /** Whether to expose the alpha slider */
  showAlpha?: boolean;
  /** Optional contrast targets that should be announced */
  contrastSamples?: ContrastSample[];
  /** Optional label used for aria attributes */
  label?: string;
  /** Id used for associating the hex input */
  id?: string;
  /** Additional description id */
  describedBy?: string;
}

const DEFAULT_COLOR = "#4F46E5";
const DEFAULT_SWATCHES = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#0EA5E9",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
];
const DEFAULT_CONTRAST_SAMPLES: ContrastSample[] = [
  { label: "On white", color: "#FFFFFF" },
  { label: "On black", color: "#000000" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toHex = (value: number) =>
  clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");

const sanitizePercent = (value: number) => clamp(Math.round(value), 0, 100);

interface ParsedColor {
  hex: string;
  alpha?: number;
}

const parseColorInput = (value: string | undefined): ParsedColor | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/^#/u, "");
  if (/^[0-9a-f]{3}$/iu.test(normalized)) {
    const expanded = normalized
      .split("")
      .map((char) => char + char)
      .join("");
    return { hex: `#${expanded.toUpperCase()}` };
  }
  if (/^[0-9a-f]{6}$/iu.test(normalized)) {
    return { hex: `#${normalized.toUpperCase()}` };
  }
  if (/^[0-9a-f]{8}$/iu.test(normalized)) {
    const hex = `#${normalized.slice(0, 6).toUpperCase()}`;
    const alpha = parseInt(normalized.slice(6), 16) / 255;
    return { hex, alpha };
  }
  const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/iu);
  if (rgbaMatch) {
    const parts = rgbaMatch[1]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      const r = clamp(Number(parts[0]), 0, 255);
      const g = clamp(Number(parts[1]), 0, 255);
      const b = clamp(Number(parts[2]), 0, 255);
      const a = parts[3] !== undefined ? clamp(Number(parts[3]), 0, 1) : undefined;
      return { hex: rgbToHex(r, g, b), alpha: a };
    }
  }
  return null;
};

const hexToRgb = (hex: string): RGB | null => {
  const parsed = parseColorInput(hex);
  if (!parsed) return null;
  const value = parsed.hex.replace("#", "");
  if (value.length !== 6) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

function rgbToHex(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

const rgbToHsl = (r: number, g: number, b: number) => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / delta + 2;
        break;
      default:
        h = (rNorm - gNorm) / delta + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hueToRgb = (p: number, q: number, t: number) => {
  let temp = t;
  if (temp < 0) temp += 1;
  if (temp > 1) temp -= 1;
  if (temp < 1 / 6) return p + (q - p) * 6 * temp;
  if (temp < 1 / 2) return q;
  if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  const sat = clamp(s / 100, 0, 1);
  const light = clamp(l / 100, 0, 1);
  const hue = ((h % 360) + 360) % 360 / 360;

  if (sat === 0) {
    const value = Math.round(light * 255);
    return { r: value, g: value, b: value };
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;

  const r = hueToRgb(p, q, hue + 1 / 3);
  const g = hueToRgb(p, q, hue);
  const b = hueToRgb(p, q, hue - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

const relativeLuminance = ({ r, g, b }: RGB) => {
  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const rL = normalize(r);
  const gL = normalize(g);
  const bL = normalize(b);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
};

const contrastRatio = (hexA: string, hexB: string) => {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return 1;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
};

const describeColor = (hex: string, alpha?: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex.toUpperCase();
  const components = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  const alphaText =
    typeof alpha === "number" ? `, ${Math.round(alpha * 100)}% opacity` : "";
  return `${hex.toUpperCase()} (RGB ${components}${alphaText})`;
};

const ColorPicker = ({
  value,
  color,
  alpha,
  onChange,
  onColorChange,
  onAlphaChange,
  swatches = DEFAULT_SWATCHES,
  showAlpha = true,
  contrastSamples = DEFAULT_CONTRAST_SAMPLES,
  label = "Color picker",
  id,
  describedBy,
}: ColorPickerProps) => {
  const initialParsed = parseColorInput(color ?? value ?? DEFAULT_COLOR);
  const initialHex = initialParsed?.hex ?? DEFAULT_COLOR;
  const isControlled = color !== undefined || value !== undefined;
  const [internalHex, setInternalHex] = useState(initialHex);
  const effectiveHex = (parseColorInput(color ?? value ?? internalHex)?.hex ?? DEFAULT_COLOR).toUpperCase();

  const alphaIsControlled = typeof alpha === "number";
  const [internalAlpha, setInternalAlpha] = useState(
    typeof initialParsed?.alpha === "number"
      ? clamp(initialParsed.alpha, 0, 1)
      : typeof alpha === "number"
        ? clamp(alpha, 0, 1)
        : 1,
  );
  const effectiveAlpha = alphaIsControlled
    ? clamp(alpha ?? internalAlpha, 0, 1)
    : internalAlpha;

  const rgb = useMemo(() => hexToRgb(effectiveHex) ?? { r: 79, g: 70, b: 229 }, [effectiveHex]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  const [hue, setHue] = useState(hsl.h);
  const [saturation, setSaturation] = useState(hsl.s);
  const [lightness, setLightness] = useState(hsl.l);
  const [hexInput, setHexInput] = useState(effectiveHex);

  useEffect(() => {
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
    setHexInput(effectiveHex);
  }, [effectiveHex, hsl.h, hsl.l, hsl.s]);

  useEffect(() => {
    if (alphaIsControlled) {
      setInternalAlpha(clamp(alpha ?? internalAlpha, 0, 1));
    }
  }, [alpha, alphaIsControlled, internalAlpha]);

  const commitColor = useCallback(
    (nextHue: number, nextSaturation: number, nextLightness: number) => {
      const { r: nr, g: ng, b: nb } = hslToRgb(nextHue, nextSaturation, nextLightness);
      const nextHex = rgbToHex(nr, ng, nb);
      if (!isControlled) {
        setInternalHex(nextHex);
      }
      setHexInput(nextHex);
      setHue(nextHue);
      setSaturation(nextSaturation);
      setLightness(nextLightness);
      onChange?.(nextHex);
      onColorChange?.(nextHex);
    },
    [isControlled, onChange, onColorChange],
  );

  const commitHex = useCallback(
    (nextValue: string) => {
      const parsed = parseColorInput(nextValue);
      if (!parsed) return false;
      if (!isControlled) {
        setInternalHex(parsed.hex);
      }
      setHexInput(parsed.hex.toUpperCase());
      const rgbValue = hexToRgb(parsed.hex);
      if (rgbValue) {
        const hslValue = rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b);
        setHue(hslValue.h);
        setSaturation(hslValue.s);
        setLightness(hslValue.l);
      }
      onChange?.(parsed.hex);
      onColorChange?.(parsed.hex);
      if (typeof parsed.alpha === "number") {
        const normalizedAlpha = clamp(parsed.alpha, 0, 1);
        if (!alphaIsControlled) setInternalAlpha(normalizedAlpha);
        onAlphaChange?.(normalizedAlpha);
      }
      return true;
    },
    [alphaIsControlled, isControlled, onAlphaChange, onChange, onColorChange],
  );

  const updateAlpha = useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, 1);
      if (!alphaIsControlled) {
        setInternalAlpha(clamped);
      }
      onAlphaChange?.(clamped);
    },
    [alphaIsControlled, onAlphaChange],
  );

  const areaRef = useRef<HTMLDivElement | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);
      const nextSaturation = sanitizePercent(x * 100);
      const nextLightness = sanitizePercent((1 - y) * 100);
      commitColor(hue, nextSaturation, nextLightness);
    },
    [commitColor, hue],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      updateFromPoint(event.clientX, event.clientY);
      const move = (moveEvent: MouseEvent) => {
        updateFromPoint(moveEvent.clientX, moveEvent.clientY);
      };
      const stop = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", stop);
        dragCleanupRef.current = null;
      };
      dragCleanupRef.current?.();
      dragCleanupRef.current = stop;
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", stop, { once: true });
    },
    [updateFromPoint],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch) return;
      updateFromPoint(touch.clientX, touch.clientY);
      const move = (moveEvent: TouchEvent) => {
        const current = moveEvent.touches[0];
        if (!current) return;
        updateFromPoint(current.clientX, current.clientY);
      };
      const stop = () => {
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", stop);
        window.removeEventListener("touchcancel", stop);
        dragCleanupRef.current = null;
      };
      dragCleanupRef.current?.();
      dragCleanupRef.current = stop;
      window.addEventListener("touchmove", move);
      window.addEventListener("touchend", stop, { once: true });
      window.addEventListener("touchcancel", stop, { once: true });
    },
    [updateFromPoint],
  );

  useEffect(() => () => dragCleanupRef.current?.(), []);

  const handleAreaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const fineStep = event.shiftKey ? 10 : 1;
      let handled = true;
      switch (event.key) {
        case "ArrowLeft":
          commitColor(hue, clamp(saturation - fineStep, 0, 100), lightness);
          break;
        case "ArrowRight":
          commitColor(hue, clamp(saturation + fineStep, 0, 100), lightness);
          break;
        case "ArrowUp":
          commitColor(hue, saturation, clamp(lightness + fineStep, 0, 100));
          break;
        case "ArrowDown":
          commitColor(hue, saturation, clamp(lightness - fineStep, 0, 100));
          break;
        case "Home":
          commitColor(hue, 0, lightness);
          break;
        case "End":
          commitColor(hue, 100, lightness);
          break;
        case "PageUp":
          commitColor(hue, saturation, clamp(lightness + 10, 0, 100));
          break;
        case "PageDown":
          commitColor(hue, saturation, clamp(lightness - 10, 0, 100));
          break;
        default:
          handled = false;
      }
      if (handled) event.preventDefault();
    },
    [commitColor, hue, lightness, saturation],
  );

  const normalizedSwatches = useMemo(() => {
    const seen = new Set<string>();
    const cleaned: string[] = [];
    swatches.forEach((swatch) => {
      const parsed = parseColorInput(swatch);
      if (!parsed) return;
      const hex = parsed.hex.toUpperCase();
      if (seen.has(hex)) return;
      seen.add(hex);
      cleaned.push(hex);
    });
    return cleaned;
  }, [swatches]);

  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSwatchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const total = normalizedSwatches.length;
      if (!total) return;
      const moveFocus = (nextIndex: number) => {
        const safeIndex = (nextIndex + total) % total;
        const next = swatchRefs.current[safeIndex];
        next?.focus();
      };
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          moveFocus(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          moveFocus(index - 1);
          break;
        case "Home":
          event.preventDefault();
          moveFocus(0);
          break;
        case "End":
          event.preventDefault();
          moveFocus(total - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          commitHex(normalizedSwatches[index]);
          break;
        default:
      }
    },
    [commitHex, normalizedSwatches],
  );

  const contrastData = useMemo(() =>
    contrastSamples
      .map((sample) => {
        const parsed = parseColorInput(sample.color);
        if (!parsed) return null;
        return {
          ...sample,
          color: parsed.hex.toUpperCase(),
          ratio: contrastRatio(effectiveHex, parsed.hex),
        };
      })
      .filter((value): value is { label: string; color: string; ratio: number } =>
        value !== null,
      ),
    [contrastSamples, effectiveHex],
  );

  const liveAnnouncement = useMemo(() => {
    const contrastSummary = contrastData
      .map((sample) => `${sample.label} ${sample.ratio}:1`)
      .join(", ");
    const base = describeColor(effectiveHex, showAlpha ? effectiveAlpha : undefined);
    return contrastSummary
      ? `${base}. Contrast ratios: ${contrastSummary}.`
      : `${base}.`;
  }, [contrastData, effectiveAlpha, effectiveHex, showAlpha]);
  const hasSelectedSwatch = normalizedSwatches.includes(effectiveHex);

  return (
    <div className="space-y-5" aria-describedby={describedBy}>
      <div className="flex flex-wrap items-start gap-4">
        <div
          ref={areaRef}
          className="relative h-48 min-w-[220px] flex-1 cursor-crosshair rounded"
          style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
          role="slider"
          aria-label={`${label} saturation and lightness`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sanitizePercent(saturation)}
          aria-valuetext={`${sanitizePercent(saturation)}% saturation, ${sanitizePercent(lightness)}% lightness`}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onKeyDown={handleAreaKeyDown}
        >
          <div
            className="absolute inset-0 rounded"
            style={{
              background:
                "linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0) 100%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 rounded"
            style={{
              background:
                "linear-gradient(0deg, #000000 0%, rgba(0,0,0,0) 100%)",
            }}
            aria-hidden="true"
          />
          <div
            aria-hidden="true"
            className="absolute h-4 w-4 rounded-full border-2 shadow-lg"
            style={{
              left: `calc(${saturation}% - 8px)`,
              top: `calc(${100 - lightness}% - 8px)`,
              backgroundColor: effectiveHex,
              borderColor: lightness > 50 ? "#000" : "#fff",
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div
            className="h-16 w-16 rounded border border-ubt-cool-grey"
            style={{ backgroundColor: effectiveHex, opacity: effectiveAlpha }}
            aria-hidden="true"
          />
          <div className="text-xs text-ubt-grey">
            {describeColor(effectiveHex, showAlpha ? effectiveAlpha : undefined)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Hue</span>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(event) =>
              commitColor(Number(event.target.value), saturation, lightness)
            }
            aria-valuetext={`${hue} degrees`}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Saturation</span>
          <input
            type="range"
            min={0}
            max={100}
            value={saturation}
            onChange={(event) =>
              commitColor(hue, Number(event.target.value), lightness)
            }
            aria-valuetext={`${sanitizePercent(saturation)} percent`}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Lightness</span>
          <input
            type="range"
            min={0}
            max={100}
            value={lightness}
            onChange={(event) =>
              commitColor(hue, saturation, Number(event.target.value))
            }
            aria-valuetext={`${sanitizePercent(lightness)} percent`}
          />
        </label>
        {showAlpha && (
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(effectiveAlpha * 100)}
              onChange={(event) =>
                updateAlpha(Number(event.target.value) / 100)
              }
              aria-valuetext={`${Math.round(effectiveAlpha * 100)} percent`}
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="font-medium" htmlFor={id ? `${id}-hex` : undefined}>
          Hex value
        </label>
        <input
          id={id ? `${id}-hex` : undefined}
          className="min-w-[120px] rounded border border-ubt-cool-grey bg-ub-cool-grey px-2 py-1 text-ubt-grey"
          value={hexInput}
          onChange={(event) => setHexInput(event.target.value.toUpperCase())}
          onBlur={() => {
            if (!commitHex(hexInput)) {
              setHexInput(effectiveHex);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!commitHex(hexInput)) {
                setHexInput(effectiveHex);
              }
            }
          }}
          aria-label="Hex color value"
        />
        <button
          type="button"
          className="rounded border border-ubt-cool-grey px-2 py-1 text-xs"
          onClick={() => {
            if (!commitHex(hexInput)) {
              setHexInput(effectiveHex);
            }
          }}
        >
          Apply
        </button>
      </div>

      {normalizedSwatches.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Preset colors</div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preset colors">
            {normalizedSwatches.map((swatch, index) => {
              const isSelected = swatch === effectiveHex;
              return (
                <button
                  key={swatch}
                  ref={(node) => {
                    swatchRefs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={
                    isSelected || (!hasSelectedSwatch && index === 0) ? 0 : -1
                  }
                  onClick={() => commitHex(swatch)}
                  onKeyDown={(event) => handleSwatchKeyDown(event, index)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    isSelected ? "border-white ring-2 ring-white ring-offset-2 ring-offset-gray-900" : "border-transparent"
                  }`}
                  style={{ backgroundColor: swatch }}
                >
                  <span className="sr-only">Select {swatch}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-medium">Contrast ratios</div>
        <ul className="space-y-1 text-xs">
          {contrastData.map((sample) => (
            <li
              key={sample.label}
              className="flex items-center justify-between gap-2 rounded border border-ubt-cool-grey px-2 py-1"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded border border-ubt-cool-grey"
                  style={{ backgroundColor: sample.color }}
                  aria-hidden="true"
                />
                <span>{sample.label}</span>
              </span>
              <span className="font-semibold">{sample.ratio}:1</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-ubt-grey">{liveAnnouncement}</p>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>
    </div>
  );
};

export default ColorPicker;
