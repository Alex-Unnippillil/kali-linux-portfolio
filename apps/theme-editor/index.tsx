'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ColorToken = {
  name: string;
  label: string;
  mode?: 'color' | 'text';
  description?: string;
};

type NumericToken = {
  name: string;
  label: string;
  unit: 'px' | 'rem';
  min: number;
  max: number;
  step: number;
  fallback: number;
  mode?: 'slider' | 'number';
  description?: string;
};

type ShadowComponents = {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  alpha: number;
};

type ShadowToken = {
  name: string;
  label: string;
  fallback: ShadowComponents;
  description?: string;
};

const colorTokens: ColorToken[] = [
  { name: '--color-ub-grey', label: 'Primary surface' },
  { name: '--color-ub-warm-grey', label: 'Warm grey' },
  { name: '--color-ub-cool-grey', label: 'Cool grey' },
  { name: '--color-ub-orange', label: 'Accent orange' },
  { name: '--color-ub-lite-abrgn', label: 'Aubergine light' },
  { name: '--color-ub-med-abrgn', label: 'Aubergine medium' },
  { name: '--color-ub-drk-abrgn', label: 'Aubergine dark' },
  { name: '--color-ub-window-title', label: 'Window chrome' },
  { name: '--color-ub-gedit-dark', label: 'Gedit dark' },
  { name: '--color-ub-gedit-light', label: 'Gedit light' },
  { name: '--color-ub-gedit-darker', label: 'Gedit darker' },
  { name: '--color-ubt-grey', label: 'Text grey' },
  { name: '--color-ubt-warm-grey', label: 'Muted warm grey' },
  { name: '--color-ubt-cool-grey', label: 'Muted cool grey' },
  { name: '--color-ubt-blue', label: 'Ubuntu blue' },
  { name: '--color-ubt-green', label: 'Ubuntu green' },
  { name: '--color-ubt-gedit-orange', label: 'Ubuntu orange' },
  { name: '--color-ubt-gedit-blue', label: 'Gedit blue' },
  { name: '--color-ubt-gedit-dark', label: 'Gedit accent dark' },
  { name: '--color-ub-border-orange', label: 'Border accent' },
  { name: '--color-ub-dark-grey', label: 'Dark grey' },
  { name: '--color-bg', label: 'Desktop background' },
  { name: '--color-text', label: 'Primary text' },
  { name: '--kali-bg', label: 'Glass background', mode: 'text' },
  { name: '--game-color-secondary', label: 'Game secondary' },
  { name: '--game-color-success', label: 'Game success' },
  { name: '--game-color-warning', label: 'Game warning' },
  { name: '--game-color-danger', label: 'Game danger' },
  { name: '--focus-outline-color', label: 'Focus outline', mode: 'text' },
];

const spacingTokens: NumericToken[] = [
  { name: '--space-1', label: 'Space 1', unit: 'rem', min: 0, max: 2.5, step: 0.05, fallback: 0.25 },
  { name: '--space-2', label: 'Space 2', unit: 'rem', min: 0, max: 3, step: 0.05, fallback: 0.5 },
  { name: '--space-3', label: 'Space 3', unit: 'rem', min: 0, max: 3.5, step: 0.05, fallback: 0.75 },
  { name: '--space-4', label: 'Space 4', unit: 'rem', min: 0, max: 4, step: 0.05, fallback: 1 },
  { name: '--space-5', label: 'Space 5', unit: 'rem', min: 0, max: 5, step: 0.05, fallback: 1.5 },
  { name: '--space-6', label: 'Space 6', unit: 'rem', min: 0, max: 6, step: 0.05, fallback: 2 },
];

const radiusTokens: NumericToken[] = [
  { name: '--radius-sm', label: 'Radius small', unit: 'px', min: 0, max: 12, step: 1, fallback: 2 },
  { name: '--radius-md', label: 'Radius medium', unit: 'px', min: 0, max: 24, step: 1, fallback: 4 },
  { name: '--radius-lg', label: 'Radius large', unit: 'px', min: 0, max: 48, step: 1, fallback: 8 },
  { name: '--radius-round', label: 'Radius round', unit: 'px', min: 0, max: 9999, step: 1, fallback: 9999, mode: 'number' },
];

const shadowTokens: ShadowToken[] = [
  {
    name: '--shadow-sm',
    label: 'Shadow small',
    fallback: { offsetX: 0, offsetY: 1, blur: 4, spread: 0, color: '#000000', alpha: 0.25 },
  },
  {
    name: '--shadow-md',
    label: 'Shadow medium',
    fallback: { offsetX: 0, offsetY: 8, blur: 24, spread: -6, color: '#000000', alpha: 0.3 },
  },
  {
    name: '--shadow-lg',
    label: 'Shadow large',
    fallback: { offsetX: 0, offsetY: 18, blur: 40, spread: -12, color: '#000000', alpha: 0.4 },
  },
];

type TokenSnapshot = {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  radii: Record<string, number>;
  shadows: Record<string, ShadowComponents>;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeHex = (value: string) => {
  const lower = value.trim().toLowerCase();
  if (/^#([0-9a-f]{6})$/.test(lower)) return lower;
  if (/^#([0-9a-f]{3})$/.test(lower)) {
    const [, r, g, b] = lower.split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
};

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (component: number) =>
    clamp(Math.round(component), 0, 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

const parseRgba = (value: string) => {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    if (value.startsWith('#')) {
      return { color: normalizeHex(value), alpha: 1 };
    }
    return { color: '#000000', alpha: 1 };
  }
  const parts = match[1].split(',').map((part) => part.trim());
  const [r = '0', g = '0', b = '0', a = '1'] = parts;
  const toByte = (component: string) => {
    const parsed = parseInt(component, 10);
    return Number.isFinite(parsed) ? clamp(parsed, 0, 255) : 0;
  };
  const red = toByte(r);
  const green = toByte(g);
  const blue = toByte(b);
  const alphaValue = parseFloat(a);
  const alpha = Number.isFinite(alphaValue) ? clamp(alphaValue, 0, 1) : 1;
  return { color: rgbToHex(red, green, blue), alpha };
};

const formatNumeric = (value: number, unit: 'px' | 'rem') => {
  if (Number.isNaN(value)) return `0${unit}`;
  const precision = unit === 'rem' ? 2 : 1;
  const rounded = Number(value.toFixed(precision));
  return `${rounded}${unit}`;
};

const parseNumeric = (value: string, fallback: number) => {
  const parsed = parseFloat(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
};

const parseShadowValue = (value: string, fallback: ShadowComponents): ShadowComponents => {
  if (!value) return fallback;
  const trimmed = value.trim();
  const colorMatch = trimmed.match(/rgba?\([^)]+\)$/i);
  const colorPart = colorMatch ? colorMatch[0] : '';
  const numericPart = colorPart ? trimmed.slice(0, trimmed.length - colorPart.length).trim() : trimmed;
  const numbers = numericPart
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => parseFloat(part.replace('px', '')));
  const [offsetX = fallback.offsetX, offsetY = fallback.offsetY, blur = fallback.blur, spread = fallback.spread] = numbers;
  const parsedColor = colorPart ? parseRgba(colorPart) : { color: fallback.color, alpha: fallback.alpha };
  return {
    offsetX,
    offsetY,
    blur,
    spread,
    color: parsedColor.color,
    alpha: parsedColor.alpha,
  };
};

const shadowToString = (value: ShadowComponents) => {
  const { r, g, b } = hexToRgb(value.color);
  return `${value.offsetX}px ${value.offsetY}px ${value.blur}px ${value.spread}px rgba(${r}, ${g}, ${b}, ${value.alpha})`;
};

const ThemeEditor = () => {
  const [colorValues, setColorValues] = useState<Record<string, string>>({});
  const [spacingValues, setSpacingValues] = useState<Record<string, number>>({});
  const [radiusValues, setRadiusValues] = useState<Record<string, number>>({});
  const [shadowValues, setShadowValues] = useState<Record<string, ShadowComponents>>({});
  const [loaded, setLoaded] = useState(false);

  const initialRef = useRef<TokenSnapshot | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const style = getComputedStyle(document.documentElement);

    const initialColors: Record<string, string> = {};
    colorTokens.forEach((token) => {
      const raw = style.getPropertyValue(token.name).trim();
      const value = raw || (token.mode === 'color' ? '#000000' : raw);
      initialColors[token.name] = token.mode === 'color' ? normalizeHex(value || '#000000') : value || '';
    });

    const initialSpacing: Record<string, number> = {};
    spacingTokens.forEach((token) => {
      const raw = style.getPropertyValue(token.name).trim();
      initialSpacing[token.name] = parseNumeric(raw, token.fallback);
    });

    const initialRadii: Record<string, number> = {};
    radiusTokens.forEach((token) => {
      const raw = style.getPropertyValue(token.name).trim();
      initialRadii[token.name] = parseNumeric(raw, token.fallback);
    });

    const initialShadows: Record<string, ShadowComponents> = {};
    shadowTokens.forEach((token) => {
      const raw = style.getPropertyValue(token.name).trim();
      initialShadows[token.name] = parseShadowValue(raw, token.fallback);
    });

    initialRef.current = {
      colors: { ...initialColors },
      spacing: { ...initialSpacing },
      radii: { ...initialRadii },
      shadows: { ...initialShadows },
    };

    setColorValues(initialColors);
    setSpacingValues(initialSpacing);
    setRadiusValues(initialRadii);
    setShadowValues(initialShadows);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    colorTokens.forEach((token) => {
      const value = colorValues[token.name];
      if (value !== undefined) {
        root.style.setProperty(token.name, value);
      }
    });
    spacingTokens.forEach((token) => {
      const value = spacingValues[token.name];
      if (value !== undefined) {
        root.style.setProperty(token.name, formatNumeric(value, token.unit));
      }
    });
    radiusTokens.forEach((token) => {
      const value = radiusValues[token.name];
      if (value !== undefined) {
        root.style.setProperty(token.name, formatNumeric(value, token.unit));
      }
    });
    shadowTokens.forEach((token) => {
      const value = shadowValues[token.name];
      if (value) {
        root.style.setProperty(token.name, shadowToString(value));
      }
    });
  }, [colorValues, spacingValues, radiusValues, shadowValues, loaded]);

  const handleColorChange = (name: string, next: string) => {
    setColorValues((prev) => ({ ...prev, [name]: next }));
  };

const handleNumericChange = (
  name: string,
  next: number,
  setter: typeof setSpacingValues | typeof setRadiusValues,
) => {
  if (!Number.isFinite(next)) return;
  setter((prev) => ({ ...prev, [name]: next }));
};

  const handleShadowChange = (name: string, updates: Partial<ShadowComponents>) => {
    setShadowValues((prev) => {
      const fallback = shadowTokens.find((token) => token.name === name)?.fallback;
      const current = prev[name] ?? fallback ?? shadowTokens[0].fallback;
      return { ...prev, [name]: { ...current, ...updates } };
    });
  };

  const resetAll = () => {
    if (!initialRef.current) return;
    setColorValues({ ...initialRef.current.colors });
    setSpacingValues({ ...initialRef.current.spacing });
    setRadiusValues({ ...initialRef.current.radii });
    const shadows: Record<string, ShadowComponents> = {};
    Object.entries(initialRef.current.shadows).forEach(([key, value]) => {
      shadows[key] = { ...value };
    });
    setShadowValues(shadows);
  };

  const snapshot = useMemo(() => {
    const shadows: Record<string, string> = {};
    Object.entries(shadowValues).forEach(([key, value]) => {
      shadows[key] = shadowToString(value);
    });
    const spacing: Record<string, string> = {};
    spacingTokens.forEach((token) => {
      const value = spacingValues[token.name];
      spacing[token.name] = formatNumeric(value ?? token.fallback, token.unit);
    });
    const radii: Record<string, string> = {};
    radiusTokens.forEach((token) => {
      const value = radiusValues[token.name];
      radii[token.name] = formatNumeric(value ?? token.fallback, token.unit);
    });

    return {
      colors: colorValues,
      spacing,
      radii,
      shadows,
    };
  }, [colorValues, spacingValues, radiusValues, shadowValues]);

  const exportJson = () => {
    const data = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'theme-tokens.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const previewShadow = useMemo(() => shadowToString(shadowValues['--shadow-md'] ?? shadowTokens[1].fallback), [shadowValues]);
  const previewButtonShadow = useMemo(
    () => shadowToString(shadowValues['--shadow-sm'] ?? shadowTokens[0].fallback),
    [shadowValues],
  );

  if (!loaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading design tokens...
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey text-white">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Theme Editor</h1>
            <p className="text-sm text-ubt-warm-grey max-w-2xl">
              Tune the design tokens that power the desktop. Adjust colors, radii, spacing, and shadows to preview a
              new look in real time. Export the configuration as JSON to version or share it with other themes.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAll}
              className="px-3 py-2 rounded-md bg-black/40 border border-white/10 hover:bg-black/60 transition"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="px-3 py-2 rounded-md bg-ubt-blue text-black font-semibold hover:bg-white transition"
            >
              Export JSON
            </button>
          </div>
        </header>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Live preview</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 bg-black/30 p-6 rounded-lg" style={{ boxShadow: previewShadow }}>
              <h3 className="text-lg font-semibold">Surface sample</h3>
              <p className="text-sm text-ubt-warm-grey">
                Cards use spacing tokens for padding, radius tokens for shape, and shadow tokens for elevation.
              </p>
              <div
                className="rounded-lg space-y-3"
                style={{
                  backgroundColor: 'var(--color-ub-grey)',
                  color: 'var(--color-text)',
                  padding: 'var(--space-4)',
                  borderRadius: `var(--radius-lg)`,
                  boxShadow: previewShadow,
                }}
              >
                <h4 className="text-lg font-semibold">Window chrome</h4>
                <p className="text-sm text-ubt-warm-grey">
                  Adjust the palette and shadows to change how windows feel across the desktop shell.
                </p>
                <div className="flex flex-wrap gap-3" style={{ gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm font-semibold"
                    style={{
                      backgroundColor: 'var(--color-ubt-blue)',
                      color: '#0b0b0b',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: previewButtonShadow,
                    }}
                  >
                    Action
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm border border-white/20"
                    style={{
                      backgroundColor: 'transparent',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: previewButtonShadow,
                    }}
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-black/30 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold">Color swatches</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {colorTokens
                  .filter((token) => token.mode !== 'text')
                  .map((token) => (
                    <div key={token.name} className="rounded-md overflow-hidden border border-white/10">
                      <div
                        className="h-16"
                        style={{ backgroundColor: `var(${token.name})` }}
                        aria-hidden
                      />
                      <div className="p-2 text-xs">
                        <p className="font-medium">{token.label}</p>
                        <p className="text-ubt-warm-grey break-all">{colorValues[token.name]}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Color tokens</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {colorTokens.map((token) => {
              const value = colorValues[token.name] ?? '';
              const isColorInput = token.mode !== 'text';
              return (
                <label key={token.name} className="flex items-center gap-3 bg-black/20 p-3 rounded-md">
                  <span className="flex-1">
                    <span className="block font-medium">{token.label}</span>
                    <span className="block text-xs text-ubt-warm-grey">{token.name}</span>
                  </span>
                  {isColorInput ? (
                    <input
                      aria-label={token.label}
                      type="color"
                      value={value || '#000000'}
                      className="h-10 w-14 rounded border border-white/10"
                      onChange={(event) => handleColorChange(token.name, event.target.value)}
                    />
                  ) : (
                    <input
                      aria-label={token.label}
                      type="text"
                      value={value}
                      className="min-w-[140px] rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm"
                      onChange={(event) => handleColorChange(token.name, event.target.value)}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Spacing scale</h2>
          <div className="space-y-3">
            {spacingTokens.map((token) => {
              const value = spacingValues[token.name] ?? token.fallback;
              return (
                <div
                  key={token.name}
                  className="bg-black/20 rounded-md px-4 py-3 flex flex-wrap items-center gap-3"
                >
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-medium">{token.label}</div>
                    <div className="text-xs text-ubt-warm-grey">{token.name}</div>
                  </div>
                  <input
                    type="range"
                    min={token.min}
                    max={token.max}
                    step={token.step}
                    value={clamp(value, token.min, token.max)}
                    onChange={(event) =>
                      handleNumericChange(
                        token.name,
                        clamp(parseFloat(event.target.value), token.min, token.max),
                        setSpacingValues,
                      )
                    }
                    className="flex-1 min-w-[180px]"
                  />
                  <input
                    type="number"
                    min={token.min}
                    max={token.max}
                    step={token.step}
                    value={Number(value.toFixed(2))}
                    onChange={(event) =>
                      handleNumericChange(
                        token.name,
                        clamp(parseFloat(event.target.value), token.min, token.max),
                        setSpacingValues,
                      )
                    }
                    className="w-24 rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-ubt-warm-grey w-16 text-right">
                    {formatNumeric(value, token.unit)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Radius tokens</h2>
          <div className="space-y-3">
            {radiusTokens.map((token) => {
              const value = radiusValues[token.name] ?? token.fallback;
              const numericValue = clamp(value, token.min, token.max);
              const showSlider = token.mode !== 'number';
              return (
                <div key={token.name} className="bg-black/20 rounded-md px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-medium">{token.label}</div>
                    <div className="text-xs text-ubt-warm-grey">{token.name}</div>
                  </div>
                  {showSlider && (
                    <input
                      type="range"
                      min={token.min}
                      max={token.max}
                      step={token.step}
                      value={numericValue}
                      onChange={(event) =>
                        handleNumericChange(
                          token.name,
                          clamp(parseFloat(event.target.value), token.min, token.max),
                          setRadiusValues,
                        )
                      }
                      className="flex-1 min-w-[180px]"
                    />
                  )}
                  <input
                    type="number"
                    min={token.min}
                    max={token.max}
                    step={token.step}
                    value={Number(value.toFixed(1))}
                    onChange={(event) =>
                      handleNumericChange(
                        token.name,
                        clamp(parseFloat(event.target.value), token.min, token.max),
                        setRadiusValues,
                      )
                    }
                    className="w-24 rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-ubt-warm-grey w-16 text-right">
                    {formatNumeric(value, token.unit)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 pb-8">
          <h2 className="text-xl font-semibold">Shadow tokens</h2>
          <div className="space-y-4">
            {shadowTokens.map((token) => {
              const value = shadowValues[token.name] ?? token.fallback;
              return (
                <div key={token.name} className="bg-black/20 rounded-lg p-4 space-y-4 border border-white/5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <div className="flex-1 min-w-[160px]">
                      <div className="font-medium">{token.label}</div>
                      <div className="text-xs text-ubt-warm-grey">{token.name}</div>
                    </div>
                    <span className="text-xs text-ubt-warm-grey break-all">{shadowToString(value)}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs">
                      Offset X (px)
                      <input
                        type="range"
                        min={-32}
                        max={32}
                        step={1}
                        value={value.offsetX}
                        onChange={(event) =>
                          handleShadowChange(token.name, { offsetX: parseInt(event.target.value, 10) })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Offset Y (px)
                      <input
                        type="range"
                        min={-32}
                        max={48}
                        step={1}
                        value={value.offsetY}
                        onChange={(event) =>
                          handleShadowChange(token.name, { offsetY: parseInt(event.target.value, 10) })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Blur (px)
                      <input
                        type="range"
                        min={0}
                        max={80}
                        step={1}
                        value={value.blur}
                        onChange={(event) =>
                          handleShadowChange(token.name, { blur: parseInt(event.target.value, 10) })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Spread (px)
                      <input
                        type="range"
                        min={-32}
                        max={32}
                        step={1}
                        value={value.spread}
                        onChange={(event) =>
                          handleShadowChange(token.name, { spread: parseInt(event.target.value, 10) })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Shadow color
                      <input
                        type="color"
                        value={value.color}
                        onChange={(event) => handleShadowChange(token.name, { color: event.target.value })}
                        className="h-10 w-14 rounded border border-white/10"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Opacity
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={value.alpha}
                        onChange={(event) =>
                          handleShadowChange(token.name, {
                            alpha: parseFloat(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="h-20 rounded-md bg-black/30" style={{ boxShadow: shadowToString(value) }} />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ThemeEditor;
