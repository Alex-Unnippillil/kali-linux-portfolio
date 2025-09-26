import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import {
    DEFAULT_WALLPAPER,
    WALLPAPER_PRESETS,
    getWallpaperId,
    getWallpaperSrc,
    isCustomWallpaper,
    makePresetWallpaper,
} from '@/utils/wallpapers';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const settingsFileInput = useRef(null);
    const wallpaperFileInput = useRef(null);

    const wallpapers = useMemo(() => WALLPAPER_PRESETS, []);
    const currentPresetId = getWallpaperId(wallpaper);
    const isCustom = isCustomWallpaper(wallpaper);
    const currentWallpaperSrc = useMemo(() => getWallpaperSrc(wallpaper), [wallpaper]);

    const changeBackgroundImage = (id) => {
        setWallpaper(makePresetWallpaper(id));
    };
    const wallpaperIndex = wallpapers.findIndex((preset) => preset.id === currentPresetId);
    const applyDefaultWallpaper = useCallback(() => {
        setWallpaper(DEFAULT_WALLPAPER);
    }, [setWallpaper]);
    const openWallpaperPicker = () => {
        if (wallpaperFileInput.current) {
            wallpaperFileInput.current.click();
        }
    };
    const handleWallpaperUpload = useCallback((event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSize) {
            if (typeof window !== 'undefined') {
                window.alert('Please choose an image smaller than 5MB.');
            }
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setWallpaper(`custom:${reader.result}`);
            }
            event.target.value = '';
        };
        reader.onerror = () => {
            console.error('Failed to read wallpaper file');
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }, [setWallpaper]);

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
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(${currentWallpaperSrc})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Theme:</label>
                <select
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
            <div className="flex flex-col items-center my-4 gap-3">
                <div className="flex flex-col items-center gap-2 sm:flex-row">
                    <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">Wallpaper:</label>
                    <input
                        id="wallpaper-slider"
                        type="range"
                        min="0"
                        max={wallpapers.length - 1}
                        step="1"
                        value={wallpaperIndex >= 0 ? wallpaperIndex : 0}
                        onChange={(e) => {
                            const next = wallpapers[parseInt(e.target.value, 10)];
                            if (next) {
                                changeBackgroundImage(next.id);
                            }
                        }}
                        className="ubuntu-slider"
                        aria-label="Wallpaper"
                        aria-valuetext={isCustom ? 'Custom wallpaper' : wallpapers[wallpaperIndex]?.name || 'Wallpaper'}
                    />
                    <span className="text-xs text-ubt-grey">
                        {isCustom ? 'Custom image' : wallpapers[wallpaperIndex]?.name || 'Preset'}
                    </span>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={openWallpaperPicker}
                        className="px-3 py-1 rounded bg-ub-orange text-white"
                    >
                        Upload Wallpaper
                    </button>
                    <button
                        type="button"
                        onClick={applyDefaultWallpaper}
                        className="px-3 py-1 rounded bg-ub-orange text-white"
                    >
                        Use Default
                    </button>
                </div>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Density:</label>
                <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Font Size:</label>
                <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={fontScale}
                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                    className="ubuntu-slider"
                />
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center">
                    <input
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                        className="mr-2"
                    />
                    Reduced Motion
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center">
                    <input
                        type="checkbox"
                        checked={largeHitAreas}
                        onChange={(e) => setLargeHitAreas(e.target.checked)}
                        className="mr-2"
                    />
                    Large Hit Areas
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center">
                    <input
                        type="checkbox"
                        checked={highContrast}
                        onChange={(e) => setHighContrast(e.target.checked)}
                        className="mr-2"
                    />
                    High Contrast
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center">
                    <input
                        type="checkbox"
                        checked={allowNetwork}
                        onChange={(e) => setAllowNetwork(e.target.checked)}
                        className="mr-2"
                    />
                    Allow Network Requests
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center">
                    <input
                        type="checkbox"
                        checked={haptics}
                        onChange={(e) => setHaptics(e.target.checked)}
                        className="mr-2"
                    />
                    Haptics
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center">
                    <input
                        type="checkbox"
                        checked={pongSpin}
                        onChange={(e) => setPongSpin(e.target.checked)}
                        className="mr-2"
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
                {wallpapers.map((preset) => {
                    const active = !isCustom && preset.id === currentPresetId;
                    return (
                        <div
                            key={preset.id}
                            role="button"
                            aria-label={`Select ${preset.name}`}
                            aria-pressed={active}
                            tabIndex="0"
                            onClick={() => changeBackgroundImage(preset.id)}
                            onFocus={() => changeBackgroundImage(preset.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    changeBackgroundImage(preset.id);
                                }
                            }}
                            className={(active ? " border-yellow-700 " : " border-transparent ") + " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"}
                            style={{ backgroundImage: `url(${preset.src})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                        ></div>
                    );
                })}
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
                    onClick={() => settingsFileInput.current && settingsFileInput.current.click()}
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
                accept="image/*"
                ref={wallpaperFileInput}
                onChange={handleWallpaperUpload}
                className="hidden"
            />
            <input
                type="file"
                accept="application/json"
                ref={settingsFileInput}
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
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
