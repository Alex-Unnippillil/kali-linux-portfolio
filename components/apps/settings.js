import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';

export function Settings() {
    const {
        accent,
        setAccent,
        wallpaper,
        setWallpaper,
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
        touchMode,
        setTouchMode,
    } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

    const changeBackgroundImage = (e) => {
        const name = e.currentTarget.dataset.path;
        setWallpaper(name);
    };

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
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-[var(--space-4)]" style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-[var(--space-3)] my-[var(--space-3)]">
                <label className="text-ubt-grey">Theme:</label>
                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="hit-area rounded border border-ubt-cool-grey bg-ub-cool-grey px-[var(--space-3)] text-ubt-grey"
                >
                    <option value="default">Default</option>
                    <option value="dark">Dark</option>
                    <option value="neon">Neon</option>
                    <option value="matrix">Matrix</option>
                </select>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-[var(--space-3)] my-[var(--space-3)]">
                <span className="text-ubt-grey">Accent:</span>
                <div aria-label="Accent color picker" role="radiogroup" className="flex flex-wrap gap-[var(--space-2)]">
                    {ACCENT_OPTIONS.map((c) => (
                        <button
                            key={c}
                            aria-label={`select-accent-${c}`}
                            role="radio"
                            aria-checked={accent === c}
                            onClick={() => setAccent(c)}
                            className={`hit-area rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-ub-orange ${accent === c ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c, width: 'var(--hit-area)', height: 'var(--hit-area)' }}
                        />
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-[var(--space-3)] my-[var(--space-3)]">
                <label className="text-ubt-grey">Density:</label>
                <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="hit-area rounded border border-ubt-cool-grey bg-ub-cool-grey px-[var(--space-3)] text-ubt-grey"
                >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                </select>
            </div>
            <div className="flex flex-col items-center gap-[var(--space-2)] my-[var(--space-3)]">
                <label className="text-ubt-grey">Font Size:</label>
                <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={fontScale}
                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                    className="ubuntu-slider w-3/4"
                />
            </div>
            <div className="flex flex-col items-center gap-[var(--space-2)] my-[var(--space-3)]">
                <label className="hit-area flex min-h-[var(--hit-area)] w-72 max-w-full items-center justify-between gap-[var(--space-2)] rounded-md border border-transparent px-[var(--space-3)] text-ubt-grey transition-colors hover:border-ubt-cool-grey">
                    <span>Reduced Motion</span>
                    <input
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                        className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
                    />
                </label>
                <label className="hit-area flex min-h-[var(--hit-area)] w-72 max-w-full items-center justify-between gap-[var(--space-2)] rounded-md border border-transparent px-[var(--space-3)] text-ubt-grey transition-colors hover:border-ubt-cool-grey">
                    <span>Large Hit Areas</span>
                    <input
                        type="checkbox"
                        checked={largeHitAreas}
                        onChange={(e) => setLargeHitAreas(e.target.checked)}
                        className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
                    />
                </label>
                <label className="hit-area flex min-h-[var(--hit-area)] w-72 max-w-full items-center justify-between gap-[var(--space-2)] rounded-md border border-transparent px-[var(--space-3)] text-ubt-grey transition-colors hover:border-ubt-cool-grey">
                    <span>High Contrast</span>
                    <input
                        type="checkbox"
                        checked={highContrast}
                        onChange={(e) => setHighContrast(e.target.checked)}
                        className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
                    />
                </label>
                <label className="hit-area flex min-h-[var(--hit-area)] w-72 max-w-full items-center justify-between gap-[var(--space-2)] rounded-md border border-transparent px-[var(--space-3)] text-ubt-grey transition-colors hover:border-ubt-cool-grey">
                    <span>Touch Mode</span>
                    <input
                        type="checkbox"
                        checked={touchMode}
                        onChange={(e) => setTouchMode(e.target.checked)}
                        className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
                    />
                </label>
                <label className="hit-area flex min-h-[var(--hit-area)] w-72 max-w-full items-center justify-between gap-[var(--space-2)] rounded-md border border-transparent px-[var(--space-3)] text-ubt-grey transition-colors hover:border-ubt-cool-grey">
                    <span>Allow Network Requests</span>
                    <input
                        type="checkbox"
                        checked={allowNetwork}
                        onChange={(e) => setAllowNetwork(e.target.checked)}
                        className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
                    />
                </label>
                <label className="hit-area flex min-h-[var(--hit-area)] w-72 max-w-full items-center justify-between gap-[var(--space-2)] rounded-md border border-transparent px-[var(--space-3)] text-ubt-grey transition-colors hover:border-ubt-cool-grey">
                    <span>Haptics</span>
                    <input
                        type="checkbox"
                        checked={haptics}
                        onChange={(e) => setHaptics(e.target.checked)}
                        className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
                    />
                </label>
                <label className="hit-area flex min-h-[var(--hit-area)] w-72 max-w-full items-center justify-between gap-[var(--space-2)] rounded-md border border-transparent px-[var(--space-3)] text-ubt-grey transition-colors hover:border-ubt-cool-grey">
                    <span>Pong Spin</span>
                    <input
                        type="checkbox"
                        checked={pongSpin}
                        onChange={(e) => setPongSpin(e.target.checked)}
                        className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
                    />
                </label>
            </div>
            <div className="flex justify-center my-[var(--space-4)]">
                <div
                    className="rounded p-[var(--space-4)] transition-colors duration-300 motion-reduce:transition-none"
                    style={{ backgroundColor: '#0f1317', color: '#ffffff' }}
                >
                    <p className="mb-2 text-center">Preview</p>
                    <button
                        className="hit-area rounded px-[var(--space-3)] py-[var(--space-2)]"
                        style={{ backgroundColor: accent, color: accentText() }}
                    >
                        Accent
                    </button>
                    <p className={`mt-2 text-sm text-center ${contrast >= 4.5 ? 'text-green-400' : 'text-red-400'}`}>
                        {`Contrast ${contrast.toFixed(2)}:1 ${contrast >= 4.5 ? 'Pass' : 'Fail'}`}
                    </p>
                    <span ref={liveRegion} role="status" aria-live="polite" className="sr-only"></span>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-[var(--space-3)] border-t border-gray-900 py-[var(--space-3)]">
                {
                    wallpapers.map((name, index) => (
                        <div
                            key={name}
                            role="button"
                            aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
                            aria-pressed={name === wallpaper}
                            tabIndex="0"
                            onClick={changeBackgroundImage}
                            onFocus={changeBackgroundImage}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    changeBackgroundImage(e);
                                }
                            }}
                            data-path={name}
                            className={((name === wallpaper) ? " border-yellow-700 " : " border-transparent ") + " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"}
                            style={{ backgroundImage: `url(/wallpapers/${name}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                        ></div>
                    ))
                }
            </div>
            <div className="flex flex-wrap items-center justify-center gap-[var(--space-3)] border-t border-gray-900 pt-[var(--space-3)]">
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
                    className="hit-area rounded bg-ub-orange px-[var(--space-4)] py-[var(--space-2)] text-white transition-colors hover:bg-ub-orange/80"
                >
                    Export Settings
                </button>
                <button
                    onClick={() => fileInput.current && fileInput.current.click()}
                    className="hit-area rounded bg-ub-orange px-[var(--space-4)] py-[var(--space-2)] text-white transition-colors hover:bg-ub-orange/80"
                >
                    Import Settings
                </button>
                <button
                    onClick={async () => {
                        await resetSettings();
                        setAccent(defaults.accent);
                        setWallpaper(defaults.wallpaper);
                        setDensity(defaults.density);
                        setReducedMotion(defaults.reducedMotion);
                        setLargeHitAreas(defaults.largeHitAreas);
                        setFontScale(defaults.fontScale);
                        setHighContrast(defaults.highContrast);
                        setAllowNetwork(defaults.allowNetwork);
                        setHaptics(defaults.haptics);
                        setPongSpin(defaults.pongSpin);
                        setTouchMode(defaults.touchMode);
                        setTheme('default');
                    }}
                    className="hit-area rounded bg-ub-orange px-[var(--space-4)] py-[var(--space-2)] text-white transition-colors hover:bg-ub-orange/80"
                >
                    Reset Desktop
                </button>
            </div>
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
                        if (parsed.density !== undefined) setDensity(parsed.density);
                        if (parsed.reducedMotion !== undefined) setReducedMotion(parsed.reducedMotion);
                        if (parsed.largeHitAreas !== undefined) setLargeHitAreas(parsed.largeHitAreas);
                        if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
                        if (parsed.allowNetwork !== undefined) setAllowNetwork(parsed.allowNetwork);
                        if (parsed.haptics !== undefined) setHaptics(parsed.haptics);
                        if (parsed.pongSpin !== undefined) setPongSpin(parsed.pongSpin);
                        if (parsed.touchMode !== undefined) setTouchMode(parsed.touchMode);
                        if (parsed.theme !== undefined) { setTheme(parsed.theme); }
                    } catch (err) {
                        console.error('Invalid settings', err);
                    }
                    e.target.value = '';
                }}
                className="hidden"
            />
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
