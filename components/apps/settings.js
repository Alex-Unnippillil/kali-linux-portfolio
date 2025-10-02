import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import KaliWallpaper from '../util-components/kali-wallpaper';
import apps, { games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

const HIDDEN_APPS_KEY = 'hiddenApps';
const HIDDEN_APPS_EVENT = 'hidden-apps-change';
const RESTORE_REQUEST_EVENT = 'request-app-restore';
const FALLBACK_ICON = '/themes/Yaru/apps/utilities-terminal-symbolic.svg';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, useKaliWallpaper, setUseKaliWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const [hiddenApps, setHiddenApps] = useState([]);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

    const sanitizeHiddenIds = useCallback((list = []) => {
        const unique = [];
        const seen = new Set();
        list.forEach((id) => {
            if (typeof id !== 'string' || seen.has(id)) return;
            seen.add(id);
            unique.push(id);
        });
        return unique;
    }, []);

    const readHiddenApps = useCallback(() => {
        if (!safeLocalStorage) return [];
        try {
            const stored = safeLocalStorage.getItem(HIDDEN_APPS_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return [];
            return sanitizeHiddenIds(parsed);
        } catch (e) {
            return [];
        }
    }, [sanitizeHiddenIds]);

    const handleRestoreApp = useCallback((id) => {
        if (typeof window === 'undefined') return;
        if (typeof id !== 'string' || !id) return;
        window.dispatchEvent(new CustomEvent(RESTORE_REQUEST_EVENT, { detail: { appId: id } }));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        setHiddenApps(readHiddenApps());
        const handleHiddenChange = (event) => {
            const detail = event?.detail;
            if (detail && Array.isArray(detail.hiddenApps)) {
                setHiddenApps(sanitizeHiddenIds(detail.hiddenApps));
            } else {
                setHiddenApps(readHiddenApps());
            }
        };
        window.addEventListener(HIDDEN_APPS_EVENT, handleHiddenChange);
        return () => {
            window.removeEventListener(HIDDEN_APPS_EVENT, handleHiddenChange);
        };
    }, [readHiddenApps, sanitizeHiddenIds]);

    const hiddenMetaMap = useMemo(() => {
        const map = new Map();
        const addEntries = (collection = []) => {
            collection.forEach((app) => {
                if (!app || typeof app.id !== 'string' || map.has(app.id)) return;
                map.set(app.id, {
                    id: app.id,
                    title: app.title,
                    icon: (app.icon || '').replace('./', '/') || FALLBACK_ICON,
                });
            });
        };
        addEntries(Array.isArray(apps) ? apps : []);
        addEntries(Array.isArray(games) ? games : []);
        return map;
    }, []);

    const hiddenEntries = useMemo(() => {
        return hiddenApps.map((id) => hiddenMetaMap.get(id) || { id, title: id, icon: FALLBACK_ICON });
    }, [hiddenApps, hiddenMetaMap]);

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
                <label className="mr-2 text-ubt-grey" htmlFor="theme-select">Theme:</label>
                <select
                    id="theme-select"
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
            <div className="flex justify-center my-4 items-center">
                <input
                    id="kali-wallpaper-toggle"
                    type="checkbox"
                    checked={useKaliWallpaper}
                    onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                    className="mr-2"
                    aria-labelledby="kali-wallpaper-label"
                />
                <label id="kali-wallpaper-label" className="text-ubt-grey flex items-center" htmlFor="kali-wallpaper-toggle">
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
                <label className="mr-2 text-ubt-grey" htmlFor="density-select">Density:</label>
                <select
                    id="density-select"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label id="font-scale-label" className="mr-2 text-ubt-grey" htmlFor="font-scale-slider">Font Size:</label>
                <input
                    id="font-scale-slider"
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={fontScale}
                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                    className="ubuntu-slider"
                    aria-labelledby="font-scale-label"
                />
            </div>
            <div className="flex justify-center my-4 items-center">
                <input
                    id="reduced-motion-toggle"
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    className="mr-2"
                    aria-labelledby="reduced-motion-label"
                />
                <label id="reduced-motion-label" className="text-ubt-grey flex items-center" htmlFor="reduced-motion-toggle">
                    Reduced Motion
                </label>
            </div>
            <div className="flex justify-center my-4 items-center">
                <input
                    id="large-hit-toggle"
                    type="checkbox"
                    checked={largeHitAreas}
                    onChange={(e) => setLargeHitAreas(e.target.checked)}
                    className="mr-2"
                    aria-labelledby="large-hit-label"
                />
                <label id="large-hit-label" className="text-ubt-grey flex items-center" htmlFor="large-hit-toggle">
                    Large Hit Areas
                </label>
            </div>
            <div className="flex justify-center my-4 items-center">
                <input
                    id="high-contrast-toggle"
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="mr-2"
                    aria-labelledby="high-contrast-label"
                />
                <label id="high-contrast-label" className="text-ubt-grey flex items-center" htmlFor="high-contrast-toggle">
                    High Contrast
                </label>
            </div>
            <div className="flex justify-center my-4 items-center">
                <input
                    id="allow-network-toggle"
                    type="checkbox"
                    checked={allowNetwork}
                    onChange={(e) => setAllowNetwork(e.target.checked)}
                    className="mr-2"
                    aria-labelledby="allow-network-label"
                />
                <label id="allow-network-label" className="text-ubt-grey flex items-center" htmlFor="allow-network-toggle">
                    Allow Network Requests
                </label>
            </div>
            <div className="flex justify-center my-4 items-center">
                <input
                    id="haptics-toggle"
                    type="checkbox"
                    checked={haptics}
                    onChange={(e) => setHaptics(e.target.checked)}
                    className="mr-2"
                    aria-labelledby="haptics-label"
                />
                <label id="haptics-label" className="text-ubt-grey flex items-center" htmlFor="haptics-toggle">
                    Haptics
                </label>
            </div>
            <div className="flex justify-center my-4 items-center">
                <input
                    id="pong-spin-toggle"
                    type="checkbox"
                    checked={pongSpin}
                    onChange={(e) => setPongSpin(e.target.checked)}
                    className="mr-2"
                    aria-labelledby="pong-spin-label"
                />
                <label id="pong-spin-label" className="text-ubt-grey flex items-center" htmlFor="pong-spin-toggle">
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
            <div className="mx-auto my-6 w-11/12 max-w-3xl rounded-lg border border-white/10 bg-black/30 p-4 text-white/80">
                <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-white/70">
                    Hidden applications
                </h2>
                {hiddenEntries.length === 0 ? (
                    <p className="text-center text-xs text-white/50">
                        No applications are hidden.
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {hiddenEntries.map((app) => (
                            <li
                                key={app.id}
                                className="flex items-center justify-between gap-3 rounded border border-white/10 bg-black/40 px-3 py-2 text-xs md:text-sm"
                            >
                                <span className="flex items-center gap-3">
                                    <Image src={app.icon} alt="" width={28} height={28} className="h-6 w-6" />
                                    <span>{app.title}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRestoreApp(app.id)}
                                    className="rounded bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                >
                                    Restore
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
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
