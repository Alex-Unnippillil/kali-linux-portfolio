import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import { ensureDisplayConfig, generateDisplayId, saveDisplayConfig } from '../../utils/displayState';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [displays, setDisplays] = useState(() => ensureDisplayConfig());
    const [activeDisplay, setActiveDisplay] = useState('display-1');
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    const persistDisplays = useCallback((list) => {
        const sanitized = list.map((display, index) => {
            const rawName = typeof display.name === 'string' ? display.name.trim() : '';
            return { id: display.id, name: rawName || `Display ${index + 1}` };
        });
        saveDisplayConfig(sanitized);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('desktop:displays-updated', { detail: sanitized }));
        }
        return sanitized;
    }, []);

    const handleDisplayNameChange = useCallback((id, value) => {
        setDisplays((prev) => prev.map((display) => (display.id === id ? { ...display, name: value } : display)));
    }, []);

    const handleDisplayNameBlur = useCallback((id) => {
        setDisplays((prev) => {
            const updated = prev.map((display, index) => {
                if (display.id !== id) return display;
                const trimmed = typeof display.name === 'string' ? display.name.trim() : '';
                return { ...display, name: trimmed || `Display ${index + 1}` };
            });
            return persistDisplays(updated);
        });
    }, [persistDisplays]);

    const handleAddDisplay = useCallback(() => {
        setDisplays((prev) => {
            const id = generateDisplayId(prev);
            const next = [...prev, { id, name: `Display ${prev.length + 1}` }];
            return persistDisplays(next);
        });
    }, [persistDisplays]);

    const handleRemoveDisplay = useCallback((id) => {
        setDisplays((prev) => {
            if (prev.length <= 1) return prev;
            const next = prev.filter((display) => display.id !== id);
            const sanitized = persistDisplays(next);
            if (activeDisplay === id) {
                const fallback = sanitized[0]?.id || 'display-1';
                setActiveDisplay(fallback);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('desktop:primary-display-change', { detail: fallback }));
                }
            }
            return sanitized;
        });
    }, [activeDisplay, persistDisplays]);

    const handleSetPrimary = useCallback((id) => {
        setActiveDisplay(id);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('desktop:primary-display-change', { detail: id }));
        }
    }, []);

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
        const syncFromDetail = (detail) => {
            if (!detail) return;
            if (Array.isArray(detail.displays) && detail.displays.length) {
                setDisplays(detail.displays.map((display, index) => ({
                    id: display.id,
                    name: display.name || `Display ${index + 1}`,
                })));
            }
            if (typeof detail.activeDisplay === 'string') {
                setActiveDisplay(detail.activeDisplay);
            }
        };

        const handleSessionUpdate = (event) => {
            syncFromDetail(event?.detail);
        };

        const handleDisplaysUpdated = (event) => {
            const detail = event?.detail;
            if (Array.isArray(detail) && detail.length) {
                setDisplays(detail.map((display, index) => ({
                    id: display.id,
                    name: display.name || `Display ${index + 1}`,
                })));
            }
        };

        const handlePrimaryDisplay = (event) => {
            const detail = event?.detail;
            const id = typeof detail === 'string' ? detail : detail?.id;
            if (typeof id === 'string') {
                setActiveDisplay(id);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('desktop:session-updated', handleSessionUpdate);
            window.addEventListener('desktop:displays-updated', handleDisplaysUpdated);
            window.addEventListener('desktop:primary-display-change', handlePrimaryDisplay);
            try {
                const stored = window.localStorage.getItem('desktop-session');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    syncFromDetail(parsed);
                } else {
                    syncFromDetail({ displays: ensureDisplayConfig(), activeDisplay: 'display-1' });
                }
            } catch {
                // ignore sync errors
            }
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('desktop:session-updated', handleSessionUpdate);
                window.removeEventListener('desktop:displays-updated', handleDisplaysUpdated);
                window.removeEventListener('desktop:primary-display-change', handlePrimaryDisplay);
            }
        };
    }, []);

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
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
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
            <section className="w-full px-6 py-4 border-t border-gray-900">
                <h2 className="text-lg text-ubt-grey mb-1">Displays &amp; Workspaces</h2>
                <p className="text-sm text-ubt-grey mb-4">
                    Manage saved workspaces for each connected display and choose which one is primary.
                </p>
                <ul className="space-y-3">
                    {displays.map((display, index) => (
                        <li key={display.id} className="bg-black bg-opacity-30 rounded-md p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                                <label className="text-xs uppercase tracking-wide text-ubt-grey">
                                    Display {index + 1}
                                </label>
                                <input
                                    type="text"
                                    value={display.name}
                                    onChange={(e) => handleDisplayNameChange(display.id, e.target.value)}
                                    onBlur={() => handleDisplayNameBlur(display.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    className="mt-2 sm:mt-0 flex-1 bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey focus:outline-none focus:ring"
                                    placeholder={`Display ${index + 1}`}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                <button
                                    type="button"
                                    onClick={() => handleSetPrimary(display.id)}
                                    className={(activeDisplay === display.id
                                        ? 'border-ub-orange text-ub-orange cursor-default '
                                        : 'border-ubt-grey text-ubt-grey hover:border-white hover:text-white ') +
                                        'px-3 py-1 rounded border transition-colors'}
                                    disabled={activeDisplay === display.id}
                                >
                                    {activeDisplay === display.id ? 'Primary display' : 'Set as primary'}
                                </button>
                                {displays.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDisplay(display.id)}
                                        className="px-3 py-1 rounded border border-ubt-grey text-ubt-grey hover:text-white hover:border-white transition-colors"
                                    >
                                        Remove
                                    </button>
                                )}
                                <span className="ml-auto text-ubt-grey">
                                    {activeDisplay === display.id ? 'Current primary workspace' : 'Workspace saved'}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
                <button
                    type="button"
                    onClick={handleAddDisplay}
                    className="mt-4 px-3 py-1 rounded border border-ubt-grey text-ubt-grey hover:text-white hover:border-white transition-colors"
                >
                    Add display workspace
                </button>
            </section>
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
            />
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
