import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import useFocusTrap from '../../hooks/useFocusTrap';
import { logEvent } from '../../utils/analytics';
import KaliWallpaper from '../util-components/kali-wallpaper';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, useKaliWallpaper, setUseKaliWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);
    const confirmDialogRef = useRef(null);
    const confirmButtonRef = useRef(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useFocusTrap(confirmDialogRef, showConfirm);

    useEffect(() => {
        if (showConfirm && confirmButtonRef.current) {
            confirmButtonRef.current.focus();
        }
    }, [showConfirm]);

    useEffect(() => {
        if (!showConfirm) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!isResetting) {
                    setShowConfirm(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showConfirm, isResetting]);

    const closeDialog = useCallback(() => {
        if (!isResetting) {
            setShowConfirm(false);
        }
    }, [isResetting]);

    const handleConfirmReset = useCallback(async () => {
        setIsResetting(true);
        try {
            await resetSettings();
            setAccent(defaults.accent);
            setWallpaper(defaults.wallpaper);
            setUseKaliWallpaper(defaults.useKaliWallpaper);
            setDensity(defaults.density);
            setReducedMotion(defaults.reducedMotion);
            setLargeHitAreas(defaults.largeHitAreas);
            setFontScale(defaults.fontScale);
            setHighContrast(defaults.highContrast);
            setAllowNetwork(defaults.allowNetwork);
            setHaptics(defaults.haptics);
            setPongSpin(defaults.pongSpin);
            setTheme('default');
            logEvent({ category: 'Settings', action: 'reset', label: 'desktop-preferences' });
        } finally {
            setIsResetting(false);
            setShowConfirm(false);
        }
    }, [setAccent, setWallpaper, setUseKaliWallpaper, setDensity, setReducedMotion, setLargeHitAreas, setFontScale, setHighContrast, setAllowNetwork, setHaptics, setPongSpin, setTheme]);

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
                <label className="mr-2 text-ubt-grey" htmlFor="settings-theme-select">Theme:</label>
                <select
                    id="settings-theme-select"
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
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor="settings-kali-wallpaper">
                    <input
                        id="settings-kali-wallpaper"
                        type="checkbox"
                        checked={useKaliWallpaper}
                        onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                        className="mr-2"
                        aria-label="Toggle Kali gradient wallpaper"
                    />
                    Kali Gradient Wallpaper
                </label>
            </div>
            {useKaliWallpaper && (
                <p className="text-center text-xs text-ubt-grey/70 px-6 -mt-2 mb-4">
                    Your previous wallpaper selection is preserved for when you turn this off.
                </p>
            )}
            <div className="flex justify-center my-4">
                <span className="mr-2 text-ubt-grey" id="settings-accent-label">Accent:</span>
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
                <label className="mr-2 text-ubt-grey" htmlFor="settings-density">Density:</label>
                <select
                    id="settings-density"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey" htmlFor="settings-font-scale">Font Size:</label>
                    <input
                        id="settings-font-scale"
                        type="range"
                        min="0.75"
                        max="1.5"
                        step="0.05"
                        value={fontScale}
                        onChange={(e) => setFontScale(parseFloat(e.target.value))}
                        className="ubuntu-slider"
                        aria-label="Adjust font size"
                    />
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor="settings-reduced-motion">
                    <input
                        id="settings-reduced-motion"
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                        className="mr-2"
                        aria-label="Toggle reduced motion"
                    />
                    Reduced Motion
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor="settings-large-hit-areas">
                    <input
                        id="settings-large-hit-areas"
                        type="checkbox"
                        checked={largeHitAreas}
                        onChange={(e) => setLargeHitAreas(e.target.checked)}
                        className="mr-2"
                        aria-label="Toggle large hit areas"
                    />
                    Large Hit Areas
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor="settings-high-contrast">
                    <input
                        id="settings-high-contrast"
                        type="checkbox"
                        checked={highContrast}
                        onChange={(e) => setHighContrast(e.target.checked)}
                        className="mr-2"
                        aria-label="Toggle high contrast"
                    />
                    High Contrast
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor="settings-allow-network">
                    <input
                        id="settings-allow-network"
                        type="checkbox"
                        checked={allowNetwork}
                        onChange={(e) => setAllowNetwork(e.target.checked)}
                        className="mr-2"
                        aria-label="Toggle network requests"
                    />
                    Allow Network Requests
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor="settings-haptics">
                    <input
                        id="settings-haptics"
                        type="checkbox"
                        checked={haptics}
                        onChange={(e) => setHaptics(e.target.checked)}
                        className="mr-2"
                        aria-label="Toggle haptics"
                    />
                    Haptics
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor="settings-pong-spin">
                    <input
                        id="settings-pong-spin"
                        type="checkbox"
                        checked={pongSpin}
                        onChange={(e) => setPongSpin(e.target.checked)}
                        className="mr-2"
                        aria-label="Toggle pong spin"
                    />
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
                    onClick={() => setShowConfirm(true)}
                    className="px-4 py-2 rounded bg-ub-orange text-white"
                >
                    Reset Desktop
                </button>
            </div>
            <input
                type="file"
                accept="application/json"
                ref={fileInput}
                aria-label="Import settings file"
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
            />
            {showConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={closeDialog}
                >
                    <div
                        ref={confirmDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="legacy-reset-dialog-title"
                        aria-describedby="legacy-reset-dialog-description"
                        aria-busy={isResetting}
                        className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="legacy-reset-dialog-title" className="text-lg font-semibold text-white">
                            Reset desktop preferences?
                        </h2>
                        <p id="legacy-reset-dialog-description" className="mt-2 text-sm text-white/70">
                            This restores wallpapers, themes, and accessibility toggles to their defaults while leaving your
                            projects, scores, and cached data intact.
                        </p>
                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                                onClick={closeDialog}
                                disabled={isResetting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                ref={confirmButtonRef}
                                className="rounded-md bg-ub-orange px-4 py-2 text-sm font-semibold text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:cursor-wait disabled:opacity-70"
                                onClick={handleConfirmReset}
                                disabled={isResetting}
                            >
                                {isResetting ? 'Resetting…' : 'Reset preferences'}
                            </button>
                        </div>
                        <span className="sr-only" aria-live="polite">
                            {isResetting ? 'Resetting preferences' : ''}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
