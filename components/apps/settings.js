import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const { flags: featureFlagValues, overrides: remoteFlagOverrides, manualOverrides: manualFlagOverrides, defaults: defaultFlagValues, source: overrideSource, status: flagStatus, error: flagError, setOverrideUrl, refreshOverrides, setFlag: setFeatureFlag, resetFlag: resetFeatureFlag, clearAllFlags: clearManualFlagOverrides } = useFeatureFlags();
    const [overrideUrlInput, setOverrideUrlInput] = useState(overrideSource || '');
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    useEffect(() => {
        setOverrideUrlInput(overrideSource || '');
    }, [overrideSource]);

    const handleApplyOverride = useCallback(() => {
        void setOverrideUrl(overrideUrlInput || null);
    }, [overrideUrlInput, setOverrideUrl]);

    const handleLoadMockOverrides = useCallback(() => {
        setOverrideUrlInput('/mock/flags.json');
        void setOverrideUrl('/mock/flags.json');
    }, [setOverrideUrl]);

    const handleClearOverrides = useCallback(() => {
        setOverrideUrlInput('');
        void setOverrideUrl(null);
    }, [setOverrideUrl]);

    const handleRefreshOverrides = useCallback(() => {
        void refreshOverrides();
    }, [refreshOverrides]);

    const manualOverrideCount = Object.keys(manualFlagOverrides).length;

    const formatFlagValue = (value) => {
        if (value === undefined) return '—';
        if (typeof value === 'string') return value;
        return `${value}`;
    };

    let statusClassName = 'text-ubt-grey';
    if (flagStatus === 'ready') {
        statusClassName = 'text-green-400';
    } else if (flagStatus === 'loading') {
        statusClassName = 'text-blue-400';
    } else if (flagStatus === 'blocked') {
        statusClassName = 'text-yellow-300';
    } else if (flagStatus === 'error') {
        statusClassName = 'text-red-400';
    }

    const sortedFlagEntries = Object.entries(featureFlagValues).sort((a, b) => a[0].localeCompare(b[0]));

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
            <div className="border-t border-gray-900 mt-8 pt-4 px-4 space-y-4">
                <div className="flex flex-col gap-1 text-left">
                    <h2 className="text-white text-base font-semibold">Feature Flags (Debug)</h2>
                    <p className="text-xs text-ubt-grey">
                        Load remote overrides and tweak values to experiment with flags during development.
                    </p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                        type="text"
                        value={overrideUrlInput}
                        onChange={(e) => setOverrideUrlInput(e.target.value)}
                        placeholder="https://example.com/flags.json"
                        className="flex-1 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleApplyOverride}
                            className="px-3 py-1 rounded bg-ub-orange text-white text-sm"
                        >
                            Apply URL
                        </button>
                        <button
                            onClick={handleLoadMockOverrides}
                            className="px-3 py-1 rounded border border-ubt-cool-grey text-sm text-white hover:bg-ub-orange hover:border-ub-orange"
                        >
                            Load Mock
                        </button>
                        <button
                            onClick={handleRefreshOverrides}
                            className="px-3 py-1 rounded border border-ubt-cool-grey text-sm text-white hover:bg-ub-orange hover:border-ub-orange"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={handleClearOverrides}
                            className="px-3 py-1 rounded border border-ubt-cool-grey text-sm text-white hover:bg-ub-orange hover:border-ub-orange"
                        >
                            Clear
                        </button>
                    </div>
                </div>
                <p className={`text-xs ${statusClassName}`}>
                    Status: {flagStatus}
                    {flagError ? ` — ${flagError}` : ''}
                </p>
                <p className="text-xs text-ubt-grey">
                    Overrides require network access to be enabled above.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ubt-grey">
                    <span>Manual overrides: {manualOverrideCount}</span>
                    <button
                        onClick={() => clearManualFlagOverrides()}
                        disabled={manualOverrideCount === 0}
                        className={`px-2 py-1 rounded border border-ubt-cool-grey ${manualOverrideCount === 0 ? 'opacity-50 cursor-not-allowed text-ubt-grey' : 'text-white hover:bg-ub-orange hover:border-ub-orange'}`}
                    >
                        Reset manual overrides
                    </button>
                </div>
                <div className="space-y-3">
                    {sortedFlagEntries.map(([key, value]) => {
                        const manual = Object.prototype.hasOwnProperty.call(manualFlagOverrides, key);
                        const remoteValue = remoteFlagOverrides[key];
                        const defaultValue = defaultFlagValues[key];
                        const sourceLabel = manual ? 'Manual override' : remoteValue !== undefined ? 'Remote override' : 'Default value';
                        return (
                            <div key={key} className="rounded border border-gray-800 bg-black bg-opacity-30 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="font-mono text-sm text-white break-all">{key}</span>
                                    <div className="flex items-center gap-2">
                                        {typeof value === 'boolean' ? (
                                            <label className="flex items-center gap-2 text-ubt-grey">
                                                <input
                                                    type="checkbox"
                                                    checked={value}
                                                    onChange={(e) => setFeatureFlag(key, e.target.checked)}
                                                    className="accent-ub-orange"
                                                />
                                                <span className="text-xs uppercase tracking-wide">{value ? 'On' : 'Off'}</span>
                                            </label>
                                        ) : (
                                            <input
                                                type="text"
                                                value={value === undefined ? '' : `${value}`}
                                                onChange={(e) => setFeatureFlag(key, e.target.value)}
                                                className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey text-xs"
                                            />
                                        )}
                                        <button
                                            onClick={() => resetFeatureFlag(key)}
                                            disabled={!manual}
                                            className={`px-2 py-1 rounded border border-ubt-cool-grey text-xs ${manual ? 'text-white hover:bg-ub-orange hover:border-ub-orange' : 'opacity-50 cursor-not-allowed text-ubt-grey'}`}
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 space-y-1 text-[11px] text-ubt-grey break-words">
                                    <div>Default: {formatFlagValue(defaultValue)}</div>
                                    <div>Remote: {formatFlagValue(remoteValue)}</div>
                                    <div>Source: {sourceLabel}</div>
                                </div>
                            </div>
                        );
                    })}
                    {sortedFlagEntries.length === 0 && (
                        <div className="text-xs text-ubt-grey">No feature flags defined yet.</div>
                    )}
                </div>
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
