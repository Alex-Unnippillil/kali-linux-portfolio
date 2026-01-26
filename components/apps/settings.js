import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import KaliWallpaper from '../util-components/kali-wallpaper';
import appMeta from '../../package.json';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, useKaliWallpaper, setUseKaliWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const [activeTab, setActiveTab] = useState('appearance');
    const [stagedAccent, setStagedAccent] = useState(accent);
    const [stagedWallpaper, setStagedWallpaper] = useState(wallpaper);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

    const changeBackgroundImage = (e) => {
        const name = e.currentTarget.dataset.path;
        setStagedWallpaper(name);
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
        return contrastRatio(stagedAccent, '#000000') > contrastRatio(stagedAccent, '#ffffff') ? '#000000' : '#ffffff';
    }, [stagedAccent, contrastRatio]);

    useEffect(() => {
        setStagedAccent(accent);
    }, [accent]);

    useEffect(() => {
        setStagedWallpaper(wallpaper);
    }, [wallpaper]);

    useEffect(() => {
        let raf = requestAnimationFrame(() => {
            let ratio = contrastRatio(stagedAccent, accentText());
            setContrast(ratio);
            if (liveRegion.current) {
                const msg = `Contrast ratio ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? 'passes' : 'fails'}`;
                liveRegion.current.textContent = msg;
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [stagedAccent, accentText, contrastRatio]);

    const hasPendingAppearance = stagedAccent !== accent || stagedWallpaper !== wallpaper;
    const appVersion = appMeta.version;

    return (
        <div className="w-full flex flex-col md:flex-row flex-grow z-20 max-h-full overflow-hidden windowMainScreen select-none bg-kali-surface text-kali-text">
            <aside className="md:w-1/4 border-b md:border-b-0 md:border-r border-kali-border/60 bg-kali-surface-raised/50">
                <nav className="flex md:flex-col gap-2 p-4" aria-label="Settings sections">
                    {['appearance', 'about'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 rounded-md text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${activeTab === tab ? 'bg-kali-primary/20 text-kali-primary' : 'hover:bg-kali-surface-muted/60 text-kali-text/80'}`}
                            aria-current={activeTab === tab ? 'page' : undefined}
                        >
                            {tab === 'appearance' ? 'Appearance' : 'About System'}
                        </button>
                    ))}
                </nav>
            </aside>
            <section className="flex-1 overflow-y-auto px-4 pb-6">
                {activeTab === 'appearance' ? (
                    <>
                        <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4 relative overflow-hidden rounded-lg shadow-inner">
                            {useKaliWallpaper ? (
                                <KaliWallpaper />
                            ) : (
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(/wallpapers/${stagedWallpaper}.webp)` }}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                        <div className="flex justify-center my-4">
                            <label htmlFor="theme-select" className="mr-2 text-kali-text/80">Theme:</label>
                            <select
                                id="theme-select"
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="bg-kali-surface-muted text-kali-text px-2 py-1 rounded-md border border-kali-border/70 transition-colors hover:border-kali-focus/60 focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-surface"
                            >
                                <option value="default">Default</option>
                                <option value="dark">Dark</option>
                                <option value="neon">Neon</option>
                                <option value="matrix">Matrix</option>
                            </select>
                        </div>
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={useKaliWallpaper}
                                    onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                                    className="mr-2"
                                    aria-label="Enable Kali gradient wallpaper"
                                />
                                Kali Gradient Wallpaper
                            </label>
                        </div>
                        {useKaliWallpaper && (
                            <p className="text-center text-xs text-kali-text/70 px-6 -mt-2 mb-4">
                                Your previous wallpaper selection is preserved for when you turn this off.
                            </p>
                        )}
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80" id="accent-picker-label">Accent:</label>
                            <div aria-labelledby="accent-picker-label" role="radiogroup" className="flex gap-2">
                                {ACCENT_OPTIONS.map((c) => (
                                    <button
                                        key={c}
                                        aria-label={`select-accent-${c}`}
                                        role="radio"
                                        aria-checked={stagedAccent === c}
                                        onClick={() => setStagedAccent(c)}
                                        className={`w-8 h-8 rounded-full border-2 ${stagedAccent === c ? 'border-white' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-center my-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setAccent(stagedAccent);
                                    setWallpaper(stagedWallpaper);
                                }}
                                disabled={!hasPendingAppearance}
                                className={`px-4 py-2 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${hasPendingAppearance ? 'bg-kali-primary text-kali-inverse hover:bg-kali-primary/90' : 'bg-kali-surface-muted text-kali-text/50 cursor-not-allowed'}`}
                            >
                                Apply Appearance
                            </button>
                        </div>
                        <div className="flex justify-center my-4">
                            <label htmlFor="density-select" className="mr-2 text-kali-text/80">Density:</label>
                            <select
                                id="density-select"
                                value={density}
                                onChange={(e) => setDensity(e.target.value)}
                                className="bg-kali-surface-muted text-kali-text px-2 py-1 rounded-md border border-kali-border/70 transition-colors hover:border-kali-focus/60 focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-surface"
                            >
                                <option value="regular">Regular</option>
                                <option value="compact">Compact</option>
                            </select>
                        </div>
                        <div className="flex justify-center my-4">
                            <label htmlFor="font-scale-slider" className="mr-2 text-kali-text/80">Font Size:</label>
                            <input
                                id="font-scale-slider"
                                type="range"
                                min="0.75"
                                max="1.5"
                                step="0.05"
                                value={fontScale}
                                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                className="kali-slider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-surface"
                                aria-label="Adjust font scale"
                            />
                        </div>
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={reducedMotion}
                                    onChange={(e) => setReducedMotion(e.target.checked)}
                                    className="mr-2"
                                    aria-label="Enable reduced motion"
                                />
                                Reduced Motion
                            </label>
                        </div>
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={largeHitAreas}
                                    onChange={(e) => setLargeHitAreas(e.target.checked)}
                                    className="mr-2"
                                    aria-label="Enable large hit areas"
                                />
                                Large Hit Areas
                            </label>
                        </div>
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={highContrast}
                                    onChange={(e) => setHighContrast(e.target.checked)}
                                    className="mr-2"
                                    aria-label="Enable high contrast mode"
                                />
                                High Contrast
                            </label>
                        </div>
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={allowNetwork}
                                    onChange={(e) => setAllowNetwork(e.target.checked)}
                                    className="mr-2"
                                    aria-label="Allow simulated network requests"
                                />
                                Allow Network Requests
                            </label>
                        </div>
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={haptics}
                                    onChange={(e) => setHaptics(e.target.checked)}
                                    className="mr-2"
                                    aria-label="Enable haptics"
                                />
                                Haptics
                            </label>
                        </div>
                        <div className="flex justify-center my-4">
                            <label className="mr-2 text-kali-text/80 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={pongSpin}
                                    onChange={(e) => setPongSpin(e.target.checked)}
                                    className="mr-2"
                                    aria-label="Enable pong spin"
                                />
                                Pong Spin
                            </label>
                        </div>
                        <div className="flex justify-center my-4">
                            <div
                                className="p-4 rounded-lg border border-kali-border/60 bg-kali-surface-raised text-kali-text transition-colors duration-300 motion-reduce:transition-none"
                            >
                                <p className="mb-2 text-center">Preview</p>
                                <button
                                    className="px-2 py-1 rounded"
                                    style={{ backgroundColor: stagedAccent, color: accentText() }}
                                >
                                    Accent
                                </button>
                                <p className={`mt-2 text-sm text-center ${contrast >= 4.5 ? 'text-kali-primary' : 'text-kali-error'}`}>
                                    {`Contrast ${contrast.toFixed(2)}:1 ${contrast >= 4.5 ? 'Pass' : 'Fail'}`}
                                </p>
                                <span ref={liveRegion} role="status" aria-live="polite" className="sr-only"></span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center items-center border-t border-kali-border/60">
                            {wallpapers.map((name) => (
                                <div
                                    key={name}
                                    role="button"
                                    aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
                                    aria-pressed={name === stagedWallpaper}
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
                                    className={`md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 rounded-lg transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${name === stagedWallpaper ? 'border-kali-primary/80 ring-2 ring-kali-primary/40 ring-offset-2 ring-offset-kali-surface' : 'border-transparent hover:border-kali-focus/40'}`}
                                    style={{ backgroundImage: `url(/wallpapers/${name}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                                ></div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="max-w-2xl mx-auto my-6">
                        <div className="p-6 rounded-xl border border-kali-border/60 bg-kali-surface-raised shadow-sm">
                            <h2 className="text-lg font-semibold mb-2">About System</h2>
                            <p className="text-sm text-kali-text/80 mb-4">
                                Kali Linux Portfolio desktop simulation with curated apps and tooling demos.
                            </p>
                            <dl className="grid grid-cols-1 gap-3 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-kali-text/70">Version</dt>
                                    <dd className="font-medium text-kali-text">{appVersion}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-kali-text/70">Author</dt>
                                    <dd className="font-medium text-kali-text">Alex Unnippillil</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-kali-text/70">Tech Stack</dt>
                                    <dd className="font-medium text-kali-text text-right">Next.js · React · Tailwind CSS · TypeScript</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                )}
                <div className="flex justify-center my-4 border-t border-kali-border/60 pt-4 space-x-4">
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
                        className="px-4 py-2 rounded-md bg-kali-primary text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                    >
                        Export Settings
                    </button>
                    <button
                        onClick={() => fileInput.current && fileInput.current.click()}
                        className="px-4 py-2 rounded-md bg-kali-primary text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                    >
                        Import Settings
                    </button>
                    <button
                        onClick={async () => {
                            await resetSettings();
                            setAccent(defaults.accent);
                            setWallpaper(defaults.wallpaper);
                            setUseKaliWallpaper(defaults.useKaliWallpaper);
                            setDensity(defaults.density);
                            setReducedMotion(defaults.reducedMotion);
                            setLargeHitAreas(defaults.largeHitAreas);
                            setFontScale(defaults.fontScale);
                            setHighContrast(defaults.highContrast);
                            setPongSpin(defaults.pongSpin);
                            setAllowNetwork(defaults.allowNetwork);
                            setHaptics(defaults.haptics);
                            setTheme('default');
                        }}
                        className="px-4 py-2 rounded-md bg-kali-primary text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
                            if (parsed.useKaliWallpaper !== undefined) setUseKaliWallpaper(parsed.useKaliWallpaper);
                            if (parsed.density !== undefined) setDensity(parsed.density);
                            if (parsed.reducedMotion !== undefined) setReducedMotion(parsed.reducedMotion);
                            if (parsed.largeHitAreas !== undefined) setLargeHitAreas(parsed.largeHitAreas);
                            if (parsed.pongSpin !== undefined) setPongSpin(parsed.pongSpin);
                            if (parsed.allowNetwork !== undefined) setAllowNetwork(parsed.allowNetwork);
                            if (parsed.haptics !== undefined) setHaptics(parsed.haptics);
                            if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
                            if (parsed.theme !== undefined) { setTheme(parsed.theme); }
                        } catch (err) {
                            console.error('Invalid settings', err);
                        }
                        e.target.value = '';
                    }}
                    className="hidden"
                    aria-label="Import settings JSON file"
                />
            </section>
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
