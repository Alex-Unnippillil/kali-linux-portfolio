import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import KaliWallpaper from '../util-components/kali-wallpaper';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, useKaliWallpaper, setUseKaliWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, performanceMode, setPerformanceMode, theme, setTheme } = useSettings();
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
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4 relative overflow-hidden rounded-lg shadow-inner">
                {useKaliWallpaper ? (
                    <KaliWallpaper />
                ) : (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)` }}
                        aria-hidden="true"
                    />
                )}
            </div>
            <div className="flex justify-center my-4">
                <label
                    id="settings-theme-label"
                    className="mr-2 text-ubt-grey"
                    htmlFor="settings-theme-select"
                >
                    Theme:
                </label>
                <select
                    id="settings-theme-select"
                    aria-labelledby="settings-theme-label"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="default">Default</option>
                    <option value="dark">Dark</option>
                    <option value="neon">Neon</option>
                    <option value="matrix">Matrix</option>
                </select>
            </div>
            <div className="flex justify-center items-center my-4">
                <input
                    id="settings-kali-wallpaper"
                    aria-labelledby="settings-kali-wallpaper-label"
                    type="checkbox"
                    checked={useKaliWallpaper}
                    onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                    className="mr-2"
                />
                <label
                    id="settings-kali-wallpaper-label"
                    className="text-ubt-grey"
                    htmlFor="settings-kali-wallpaper"
                >
                    Kali Gradient Wallpaper
                </label>
            </div>
            {useKaliWallpaper && (
                <p className="text-center text-xs text-ubt-grey/70 px-6 -mt-2 mb-4">
                    Your previous wallpaper selection is preserved for when you turn this off.
                </p>
            )}
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Accent:</label>
                <div aria-label="Accent color picker" role="radiogroup" className="flex gap-2">
                    {ACCENT_OPTIONS.map((c) => (
                        <button
                            key={c}
                            aria-label={`select-accent-${c}`}
                            role="radio"
                            aria-checked={accent === c}
                            onClick={() => setAccent(c)}
                            className={`w-8 h-8 rounded-full border-2 ${accent === c ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>
            <div className="flex justify-center my-4">
                <label
                    id="settings-density-label"
                    className="mr-2 text-ubt-grey"
                    htmlFor="settings-density-select"
                >
                    Density:
                </label>
                <select
                    id="settings-density-select"
                    aria-labelledby="settings-density-label"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label
                    id="settings-font-scale-label"
                    className="mr-2 text-ubt-grey"
                    htmlFor="settings-font-scale"
                >
                    Font Size:
                </label>
                <input
                    id="settings-font-scale"
                    aria-labelledby="settings-font-scale-label"
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={fontScale}
                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                    className="ubuntu-slider"
                />
            </div>
            <div className="flex justify-center items-center my-4">
                <input
                    id="settings-reduced-motion"
                    aria-labelledby="settings-reduced-motion-label"
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    className="mr-2"
                />
                <label
                    id="settings-reduced-motion-label"
                    className="text-ubt-grey"
                    htmlFor="settings-reduced-motion"
                >
                    Reduced Motion
                </label>
            </div>
            <div className="flex justify-center items-center my-4">
                <input
                    id="settings-large-hit-areas"
                    aria-labelledby="settings-large-hit-areas-label"
                    type="checkbox"
                    checked={largeHitAreas}
                    onChange={(e) => setLargeHitAreas(e.target.checked)}
                    className="mr-2"
                />
                <label
                    id="settings-large-hit-areas-label"
                    className="text-ubt-grey"
                    htmlFor="settings-large-hit-areas"
                >
                    Large Hit Areas
                </label>
            </div>
            <div className="flex justify-center items-center my-4">
                <input
                    id="settings-high-contrast"
                    aria-labelledby="settings-high-contrast-label"
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="mr-2"
                />
                <label
                    id="settings-high-contrast-label"
                    className="text-ubt-grey"
                    htmlFor="settings-high-contrast"
                >
                    High Contrast
                </label>
            </div>
            <div className="flex justify-center items-center my-4">
                <input
                    id="settings-allow-network"
                    aria-labelledby="settings-allow-network-label"
                    type="checkbox"
                    checked={allowNetwork}
                    onChange={(e) => setAllowNetwork(e.target.checked)}
                    className="mr-2"
                />
                <label
                    id="settings-allow-network-label"
                    className="text-ubt-grey"
                    htmlFor="settings-allow-network"
                >
                    Allow Network Requests
                </label>
            </div>
            <div className="flex justify-center items-center my-4">
                <input
                    id="settings-haptics"
                    aria-labelledby="settings-haptics-label"
                    type="checkbox"
                    checked={haptics}
                    onChange={(e) => setHaptics(e.target.checked)}
                    className="mr-2"
                />
                <label
                    id="settings-haptics-label"
                    className="text-ubt-grey"
                    htmlFor="settings-haptics"
                >
                    Haptics
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label
                    id="settings-performance-mode-label"
                    className="mr-2 text-ubt-grey"
                    htmlFor="settings-performance-mode"
                >
                    Performance Mode:
                </label>
                <select
                    id="settings-performance-mode"
                    aria-labelledby="settings-performance-mode-label"
                    value={performanceMode}
                    onChange={(e) => setPerformanceMode(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="auto">Auto (recommended)</option>
                    <option value="battery-saver">Battery Saver</option>
                    <option value="high-performance">High Performance</option>
                </select>
            </div>
            <p className="text-center text-xs text-ubt-grey/70 px-6 -mt-2 mb-4">
                Auto throttles background workers when battery saver, low-end hardware, or input latency spikes are detected.
                Override when you need full speed or maximum efficiency.
            </p>
            <div className="flex justify-center items-center my-4">
                <input
                    id="settings-pong-spin"
                    aria-labelledby="settings-pong-spin-label"
                    type="checkbox"
                    checked={pongSpin}
                    onChange={(e) => setPongSpin(e.target.checked)}
                    className="mr-2"
                />
                <label
                    id="settings-pong-spin-label"
                    className="text-ubt-grey"
                    htmlFor="settings-pong-spin"
                >
                    Pong Spin
                </label>
            </div>
            <div className="flex justify-center my-4">
                <div
                    className="p-4 rounded transition-colors duration-300 motion-reduce:transition-none"
                    style={{ backgroundColor: '#0f1317', color: '#ffffff' }}
                >
                    <p className="mb-2 text-center">Preview</p>
                    <button
                        className="px-2 py-1 rounded"
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
            <div className="flex flex-wrap justify-center items-center border-t border-gray-900">
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
            <div className="flex justify-center my-4 border-t border-gray-900 pt-4 space-x-4">
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
                    className="px-4 py-2 rounded bg-ub-orange text-white"
                >
                    Export Settings
                </button>
                <button
                    onClick={() => fileInput.current && fileInput.current.click()}
                    className="px-4 py-2 rounded bg-ub-orange text-white"
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
                        setTheme('default');
                    }}
                    className="px-4 py-2 rounded bg-ub-orange text-white"
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
                        if (parsed.theme !== undefined) { setTheme(parsed.theme); }
                    } catch (err) {
                        console.error('Invalid settings', err);
                    }
                    e.target.value = '';
                }}
                className="hidden"
                aria-label="Import settings file"
            />
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
