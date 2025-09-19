import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';

export function Settings() {
    const {
        accent,
        setAccent,
        wallpaper,
        setWallpaper,
        wallpaperBlur,
        setWallpaperBlur,
        wallpaperBrightness,
        setWallpaperBrightness,
        density,
        setDensity,
        reducedMotion,
        setReducedMotion,
        largeHitAreas,
        setLargeHitAreas,
        fontScale,
        setFontScale,
        highContrast,
        setHighContrast,
        pongSpin,
        setPongSpin,
        allowNetwork,
        setAllowNetwork,
        haptics,
        setHaptics,
        theme,
        setTheme,
    } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];
    const previewFilter = `blur(${wallpaperBlur}px) brightness(${wallpaperBrightness})`;
    const brightnessPercent = Math.round(wallpaperBrightness * 100);

    let hexToRgb = (hex) => {
        hex = hex.replace('#', '');
        let bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255,
        };
    };

    let luminance = ({ r, g, b }) => {
        let a = [r, g, b].map(v => {
            v = v / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const contrastRatio = useCallback((hex1, hex2) => {
        let l1 = luminance(hexToRgb(hex1)) + 0.05;
        let l2 = luminance(hexToRgb(hex2)) + 0.05;
        return l1 > l2 ? l1 / l2 : l2 / l1;
    }, []);

    const accentText = useCallback(() => {
        return contrastRatio(accent, '#000000') > contrastRatio(accent, '#ffffff') ? '#000000' : '#ffffff';
    }, [accent, contrastRatio]);

    useEffect(() => {
        let raf = requestAnimationFrame(() => {
            let ratio = contrastRatio(accent, accentText());
            setContrast(ratio);
            if (liveRegion.current) {
                const msg = `Contrast ratio ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? 'passes' : 'fails'}`;
                liveRegion.current.textContent = msg;
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [accent, accentText, contrastRatio]);

    return (
        <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
            <div className="mx-auto w-full max-w-5xl space-y-8 p-6">
                <section className="rounded-lg border border-ubt-cool-grey bg-ub-lite-abrgn/60 p-4 shadow-inner">
                    <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-ubt-grey">Wallpaper &amp; effects</h2>
                    <div className="flex flex-col gap-6 lg:flex-row">
                        <div className="relative overflow-hidden rounded-lg border border-ubt-cool-grey bg-black/50 shadow-inner lg:w-1/2">
                            <img
                                src={`/wallpapers/${wallpaper}.webp`}
                                alt="Current wallpaper preview"
                                className="h-full w-full object-cover transition-[filter] duration-300 ease-in-out"
                                style={{ filter: previewFilter }}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" aria-hidden="true"></div>
                            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                                <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                    Live preview
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-4">
                            <label htmlFor="wallpaper-blur" className="flex flex-col gap-2 text-ubt-grey">
                                <span className="text-sm font-semibold uppercase tracking-wide">Blur</span>
                                <input
                                    id="wallpaper-blur"
                                    type="range"
                                    min="0"
                                    max="20"
                                    step="1"
                                    value={wallpaperBlur}
                                    onChange={(e) => setWallpaperBlur(Number(e.target.value))}
                                    className="ubuntu-slider"
                                    aria-valuemin={0}
                                    aria-valuemax={20}
                                    aria-valuenow={wallpaperBlur}
                                    aria-valuetext={`${wallpaperBlur} pixels`}
                                />
                                <span className="text-xs text-ubt-warm-grey">{wallpaperBlur} px</span>
                            </label>
                            <label htmlFor="wallpaper-brightness" className="flex flex-col gap-2 text-ubt-grey">
                                <span className="text-sm font-semibold uppercase tracking-wide">Brightness</span>
                                <input
                                    id="wallpaper-brightness"
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.05"
                                    value={wallpaperBrightness}
                                    onChange={(e) => setWallpaperBrightness(parseFloat(e.target.value))}
                                    className="ubuntu-slider"
                                    aria-valuemin={0.5}
                                    aria-valuemax={1.5}
                                    aria-valuenow={wallpaperBrightness}
                                    aria-valuetext={`${brightnessPercent}%`}
                                />
                                <span className="text-xs text-ubt-warm-grey">{brightnessPercent}%</span>
                            </label>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ubt-grey">Select wallpaper</h3>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {wallpapers.map((name) => {
                                const isActive = name === wallpaper;
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setWallpaper(name)}
                                        className={`relative h-24 overflow-hidden rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-focus-ring)] ${isActive ? 'border-ub-orange shadow-lg' : 'border-transparent hover:border-ubt-grey/40'}`}
                                        aria-pressed={isActive}
                                        aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
                                    >
                                        <img
                                            src={`/wallpapers/${name}.webp`}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                        {isActive && (
                                            <span className="absolute inset-0 border-2 border-white/60" aria-hidden="true" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
                <section className="rounded-lg border border-ubt-cool-grey bg-ub-lite-abrgn/60 p-4 shadow-inner">
                    <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-ubt-grey">Theme &amp; accent</h2>
                    <div className="flex flex-col gap-6 md:flex-row">
                        <div className="flex flex-1 flex-col gap-4">
                            <label className="flex flex-col gap-2 text-ubt-grey">
                                <span className="text-sm font-semibold uppercase tracking-wide">Theme</span>
                                <select
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                    className="rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-ubt-grey"
                                >
                                    <option value="default">Default</option>
                                    <option value="dark">Dark</option>
                                    <option value="neon">Neon</option>
                                    <option value="matrix">Matrix</option>
                                </select>
                            </label>
                            <div>
                                <span className="mb-2 block text-sm font-semibold uppercase tracking-wide text-ubt-grey">Accent</span>
                                <div role="radiogroup" aria-label="Accent color picker" className="flex flex-wrap gap-2">
                                    {ACCENT_OPTIONS.map((c) => {
                                        const isActive = accent === c;
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                role="radio"
                                                aria-checked={isActive}
                                                aria-label={`select-accent-${c}`}
                                                onClick={() => setAccent(c)}
                                                className={`h-10 w-10 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-focus-ring)] ${isActive ? 'border-white shadow-lg' : 'border-transparent hover:border-white/40'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            <label className="flex flex-col gap-2 text-ubt-grey">
                                <span className="text-sm font-semibold uppercase tracking-wide">Density</span>
                                <select
                                    value={density}
                                    onChange={(e) => setDensity(e.target.value)}
                                    className="rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-ubt-grey"
                                >
                                    <option value="regular">Regular</option>
                                    <option value="compact">Compact</option>
                                </select>
                            </label>
                            <label htmlFor="font-scale" className="flex flex-col gap-2 text-ubt-grey">
                                <span className="text-sm font-semibold uppercase tracking-wide">Font size</span>
                                <input
                                    id="font-scale"
                                    type="range"
                                    min="0.75"
                                    max="1.5"
                                    step="0.05"
                                    value={fontScale}
                                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                    className="ubuntu-slider"
                                    aria-valuemin={0.75}
                                    aria-valuemax={1.5}
                                    aria-valuenow={fontScale}
                                    aria-valuetext={`${Math.round(fontScale * 100)}%`}
                                />
                            </label>
                        </div>
                        <div className="flex w-full max-w-xs flex-col items-center justify-center gap-3 rounded-lg border border-ubt-cool-grey bg-ub-dark px-4 py-6 text-ubt-grey">
                            <p className="text-sm font-semibold uppercase tracking-wide">Accent preview</p>
                            <button
                                className="rounded px-4 py-2 font-semibold shadow"
                                style={{ backgroundColor: accent, color: accentText() }}
                            >
                                Accent
                            </button>
                            <p className={`text-sm ${contrast >= 4.5 ? 'text-green-400' : 'text-red-400'}`}>
                                {`Contrast ${contrast.toFixed(2)}:1 ${contrast >= 4.5 ? 'Pass' : 'Fail'}`}
                            </p>
                            <span ref={liveRegion} role="status" aria-live="polite" className="sr-only"></span>
                        </div>
                    </div>
                </section>
                <section className="rounded-lg border border-ubt-cool-grey bg-ub-lite-abrgn/60 p-4 shadow-inner">
                    <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-ubt-grey">Accessibility &amp; controls</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-3 rounded border border-transparent bg-ub-cool-grey/60 px-3 py-2 text-ubt-grey transition hover:border-ubt-grey/40">
                            <input
                                type="checkbox"
                                checked={reducedMotion}
                                onChange={(e) => setReducedMotion(e.target.checked)}
                                className="h-5 w-5"
                            />
                            Reduced motion
                        </label>
                        <label className="flex items-center gap-3 rounded border border-transparent bg-ub-cool-grey/60 px-3 py-2 text-ubt-grey transition hover:border-ubt-grey/40">
                            <input
                                type="checkbox"
                                checked={largeHitAreas}
                                onChange={(e) => setLargeHitAreas(e.target.checked)}
                                className="h-5 w-5"
                            />
                            Large hit areas
                        </label>
                        <label className="flex items-center gap-3 rounded border border-transparent bg-ub-cool-grey/60 px-3 py-2 text-ubt-grey transition hover:border-ubt-grey/40">
                            <input
                                type="checkbox"
                                checked={highContrast}
                                onChange={(e) => setHighContrast(e.target.checked)}
                                className="h-5 w-5"
                            />
                            High contrast
                        </label>
                        <label className="flex items-center gap-3 rounded border border-transparent bg-ub-cool-grey/60 px-3 py-2 text-ubt-grey transition hover:border-ubt-grey/40">
                            <input
                                type="checkbox"
                                checked={allowNetwork}
                                onChange={(e) => setAllowNetwork(e.target.checked)}
                                className="h-5 w-5"
                            />
                            Allow network requests
                        </label>
                        <label className="flex items-center gap-3 rounded border border-transparent bg-ub-cool-grey/60 px-3 py-2 text-ubt-grey transition hover:border-ubt-grey/40">
                            <input
                                type="checkbox"
                                checked={haptics}
                                onChange={(e) => setHaptics(e.target.checked)}
                                className="h-5 w-5"
                            />
                            Haptics
                        </label>
                        <label className="flex items-center gap-3 rounded border border-transparent bg-ub-cool-grey/60 px-3 py-2 text-ubt-grey transition hover:border-ubt-grey/40">
                            <input
                                type="checkbox"
                                checked={pongSpin}
                                onChange={(e) => setPongSpin(e.target.checked)}
                                className="h-5 w-5"
                            />
                            Pong spin
                        </label>
                    </div>
                </section>
                <section className="rounded-lg border border-ubt-cool-grey bg-ub-lite-abrgn/60 p-4 shadow-inner">
                    <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-ubt-grey">Data</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={async () => {
                                const data = await exportSettingsData();
                                const blob = new Blob([data], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'settings.json';
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="rounded bg-ub-orange px-4 py-2 font-semibold text-white transition hover:bg-ub-orange/90"
                        >
                            Export settings
                        </button>
                        <button
                            onClick={() => fileInput.current && fileInput.current.click()}
                            className="rounded bg-ub-orange px-4 py-2 font-semibold text-white transition hover:bg-ub-orange/90"
                        >
                            Import settings
                        </button>
                        <button
                            onClick={async () => {
                                await resetSettings();
                                setAccent(defaults.accent);
                                setWallpaper(defaults.wallpaper);
                                setWallpaperBlur(defaults.wallpaperBlur);
                                setWallpaperBrightness(defaults.wallpaperBrightness);
                                setDensity(defaults.density);
                                setReducedMotion(defaults.reducedMotion);
                                setLargeHitAreas(defaults.largeHitAreas);
                                setFontScale(defaults.fontScale);
                                setHighContrast(defaults.highContrast);
                                setAllowNetwork(defaults.allowNetwork);
                                setHaptics(defaults.haptics);
                                setPongSpin(defaults.pongSpin);
                                setTheme('default');
                            }}
                            className="rounded bg-ub-orange px-4 py-2 font-semibold text-white transition hover:bg-ub-orange/90"
                        >
                            Reset desktop
                        </button>
                    </div>
                </section>
                <input
                    type="file"
                    accept="application/json"
                    ref={fileInput}
                    onChange={async (e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        const text = await file.text();
                        await importSettingsData(text);
                        try {
                            const parsed = JSON.parse(text);
                            if (parsed.accent !== undefined) setAccent(parsed.accent);
                            if (parsed.wallpaper !== undefined) setWallpaper(parsed.wallpaper);
                            if (parsed.wallpaperBlur !== undefined) setWallpaperBlur(parsed.wallpaperBlur);
                            if (parsed.wallpaperBrightness !== undefined) setWallpaperBrightness(parsed.wallpaperBrightness);
                            if (parsed.density !== undefined) setDensity(parsed.density);
                            if (parsed.reducedMotion !== undefined) setReducedMotion(parsed.reducedMotion);
                            if (parsed.largeHitAreas !== undefined) setLargeHitAreas(parsed.largeHitAreas);
                            if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
                            if (parsed.allowNetwork !== undefined) setAllowNetwork(parsed.allowNetwork);
                            if (parsed.haptics !== undefined) setHaptics(parsed.haptics);
                            if (parsed.pongSpin !== undefined) setPongSpin(parsed.pongSpin);
                            if (parsed.fontScale !== undefined) setFontScale(parsed.fontScale);
                            if (parsed.theme !== undefined) {
                                setTheme(parsed.theme);
                            }
                        } catch (err) {
                            console.error('Invalid settings', err);
                        }
                        e.target.value = '';
                    }}
                    className="hidden"
                />
            </div>
        </div>
    );
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
