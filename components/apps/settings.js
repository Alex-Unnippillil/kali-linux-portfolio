import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { useImportFuse } from '../../hooks/useImportFuse';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import KaliWallpaper from '../util-components/kali-wallpaper';

const CONTROL_IDS = {
    theme: 'settings-theme-select',
    useKaliWallpaper: 'settings-use-kali-wallpaper',
    density: 'settings-density-select',
    fontScale: 'settings-font-scale',
    reducedMotion: 'settings-reduced-motion',
    largeHitAreas: 'settings-large-hit-areas',
    highContrast: 'settings-high-contrast',
    allowNetwork: 'settings-allow-network',
    haptics: 'settings-haptics',
    pongSpin: 'settings-pong-spin',
};

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, useKaliWallpaper, setUseKaliWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const { config: importFuseConfig, updateConfig: updateImportFuseConfig, resetConfig: resetImportFuseConfig, metrics: importFuseMetrics, clearMetrics: clearImportFuseMetrics } = useImportFuse();
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

    const fuseMetrics = useMemo(() => (importFuseMetrics || []).slice(0, 6), [importFuseMetrics]);

    const handleFuseChange = useCallback((key, transform = (value) => value) => (event) => {
        const value = parseInt(event.target.value, 10);
        if (Number.isNaN(value)) return;
        const nextValue = transform(value);
        updateImportFuseConfig({ [key]: nextValue });
    }, [updateImportFuseConfig]);

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
                <label className="mr-2 text-ubt-grey" htmlFor={CONTROL_IDS.theme}>Theme:</label>
                <select
                    id={CONTROL_IDS.theme}
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    aria-label="Theme"
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="default">Default</option>
                    <option value="dark">Dark</option>
                    <option value="neon">Neon</option>
                    <option value="matrix">Matrix</option>
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor={CONTROL_IDS.useKaliWallpaper}>
                    <input
                        id={CONTROL_IDS.useKaliWallpaper}
                        type="checkbox"
                        checked={useKaliWallpaper}
                        onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                        aria-label="Toggle Kali gradient wallpaper"
                        className="mr-2"
                    />
                    Kali Gradient Wallpaper
                </label>
            </div>
            <div className="mx-auto my-6 w-11/12 rounded-lg border border-ubt-cool-grey/60 bg-black/30 p-4 text-sm">
                <h2 className="mb-3 text-center text-lg font-semibold text-white">Import Fuse</h2>
                <p className="mb-4 text-center text-xs text-white/60">
                    Instrumented imports compare file size and complexity against these thresholds. Adjust them here if you routinely load large fixtures.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1" htmlFor="import-fuse-max-bytes">
                        <span className="text-xs uppercase tracking-wide text-white/60">Max file size (KB)</span>
                        <input
                            id="import-fuse-max-bytes"
                            type="number"
                            min={1}
                            value={Math.round((importFuseConfig?.maxBytes || 0) / 1024)}
                            onChange={handleFuseChange('maxBytes', (val) => Math.max(1000, val * 1024))}
                            aria-label="Maximum file size in kilobytes"
                            className="rounded border border-white/20 bg-black/50 p-2 text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-1" htmlFor="import-fuse-max-lines">
                        <span className="text-xs uppercase tracking-wide text-white/60">Max line count</span>
                        <input
                            id="import-fuse-max-lines"
                            type="number"
                            min={100}
                            value={importFuseConfig?.maxLines || 0}
                            onChange={handleFuseChange('maxLines')}
                            aria-label="Maximum line count"
                            className="rounded border border-white/20 bg-black/50 p-2 text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-1" htmlFor="import-fuse-max-complexity">
                        <span className="text-xs uppercase tracking-wide text-white/60">Max complexity score</span>
                        <input
                            id="import-fuse-max-complexity"
                            type="number"
                            min={1000}
                            value={importFuseConfig?.maxComplexity || 0}
                            onChange={handleFuseChange('maxComplexity')}
                            aria-label="Maximum complexity score"
                            className="rounded border border-white/20 bg-black/50 p-2 text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-1" htmlFor="import-fuse-preview-lines">
                        <span className="text-xs uppercase tracking-wide text-white/60">Preview lines</span>
                        <input
                            id="import-fuse-preview-lines"
                            type="number"
                            min={1}
                            max={200}
                            value={importFuseConfig?.previewLines || 0}
                            onChange={handleFuseChange('previewLines')}
                            aria-label="Number of preview lines"
                            className="rounded border border-white/20 bg-black/50 p-2 text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2" htmlFor="import-fuse-preview-chars">
                        <span className="text-xs uppercase tracking-wide text-white/60">Preview characters</span>
                        <input
                            id="import-fuse-preview-chars"
                            type="number"
                            min={200}
                            max={20000}
                            value={importFuseConfig?.previewChars || 0}
                            onChange={handleFuseChange('previewChars')}
                            aria-label="Number of preview characters"
                            className="rounded border border-white/20 bg-black/50 p-2 text-white"
                        />
                    </label>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={resetImportFuseConfig}
                        className="rounded bg-ub-orange px-3 py-2 font-semibold text-black"
                    >
                        Reset thresholds
                    </button>
                    <button
                        type="button"
                        onClick={clearImportFuseMetrics}
                        className="rounded border border-white/40 px-3 py-2 font-semibold text-white"
                    >
                        Clear metrics
                    </button>
                </div>
                <div className="mt-4 max-h-40 overflow-y-auto rounded border border-white/10 bg-black/50 p-3 text-xs">
                    {fuseMetrics.length === 0 ? (
                        <p className="text-center text-white/60">No recent imports recorded yet.</p>
                    ) : (
                        <table className="w-full border-collapse text-left">
                            <thead className="text-white/70">
                                <tr>
                                    <th className="pb-2 pr-2">File</th>
                                    <th className="pb-2 pr-2">Action</th>
                                    <th className="pb-2 pr-2">Size</th>
                                    <th className="pb-2 pr-2">Lines</th>
                                    <th className="pb-2">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fuseMetrics.map((entry) => (
                                    <tr key={`${entry.timestamp}-${entry.fileName}`} className="border-t border-white/10 text-white/80">
                                        <td className="py-1 pr-2">
                                            <span className="block truncate" title={`${entry.fileName} (${entry.source})`}>
                                                {entry.fileName}
                                            </span>
                                            <span className="block text-[0.65rem] text-white/50">
                                                {new Date(entry.timestamp).toLocaleString()} · {entry.source}
                                            </span>
                                        </td>
                                        <td className="py-1 pr-2 capitalize">{entry.action}</td>
                                        <td className="py-1 pr-2">{Math.round(entry.metrics.bytes / 1024).toLocaleString()} KB</td>
                                        <td className="py-1 pr-2">{entry.metrics.lineCount.toLocaleString()}</td>
                                        <td className="py-1">{entry.metrics.complexity.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
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
                <label className="mr-2 text-ubt-grey" htmlFor={CONTROL_IDS.density}>Density:</label>
                <select
                    id={CONTROL_IDS.density}
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    aria-label="Density"
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey" htmlFor={CONTROL_IDS.fontScale}>Font Size:</label>
                <input
                    id={CONTROL_IDS.fontScale}
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={fontScale}
                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                    aria-label="Font size"
                    className="ubuntu-slider"
                />
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor={CONTROL_IDS.reducedMotion}>
                    <input
                        id={CONTROL_IDS.reducedMotion}
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                        aria-label="Toggle reduced motion"
                        className="mr-2"
                    />
                    Reduced Motion
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor={CONTROL_IDS.largeHitAreas}>
                    <input
                        id={CONTROL_IDS.largeHitAreas}
                        type="checkbox"
                        checked={largeHitAreas}
                        onChange={(e) => setLargeHitAreas(e.target.checked)}
                        aria-label="Toggle large hit areas"
                        className="mr-2"
                    />
                    Large Hit Areas
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor={CONTROL_IDS.highContrast}>
                    <input
                        id={CONTROL_IDS.highContrast}
                        type="checkbox"
                        checked={highContrast}
                        onChange={(e) => setHighContrast(e.target.checked)}
                        aria-label="Toggle high contrast"
                        className="mr-2"
                    />
                    High Contrast
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor={CONTROL_IDS.allowNetwork}>
                    <input
                        id={CONTROL_IDS.allowNetwork}
                        type="checkbox"
                        checked={allowNetwork}
                        onChange={(e) => setAllowNetwork(e.target.checked)}
                        aria-label="Toggle network requests"
                        className="mr-2"
                    />
                    Allow Network Requests
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor={CONTROL_IDS.haptics}>
                    <input
                        id={CONTROL_IDS.haptics}
                        type="checkbox"
                        checked={haptics}
                        onChange={(e) => setHaptics(e.target.checked)}
                        aria-label="Toggle haptics"
                        className="mr-2"
                    />
                    Haptics
                </label>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center" htmlFor={CONTROL_IDS.pongSpin}>
                    <input
                        id={CONTROL_IDS.pongSpin}
                        type="checkbox"
                        checked={pongSpin}
                        onChange={(e) => setPongSpin(e.target.checked)}
                        aria-label="Toggle Pong spin"
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
            <label id="settings-import-file-label" htmlFor="settings-import-file" className="sr-only">
                Import settings JSON file
            </label>
            <input
                id="settings-import-file"
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
                className="sr-only"
                tabIndex={-1}
                aria-labelledby="settings-import-file-label"
            />
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
