import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import KaliWallpaper from '../util-components/kali-wallpaper';

export function Settings({ context } = {}) {
    const { accent, setAccent, wallpaper, setWallpaper, useKaliWallpaper, setUseKaliWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);
    const containerRef = useRef(null);
    const appearanceRef = useRef(null);
    const accessibilityRef = useRef(null);
    const systemRef = useRef(null);
    const dataRef = useRef(null);
    const highlightTimeout = useRef(null);
    const [highlightedSection, setHighlightedSection] = useState(null);
    const [highlightedSetting, setHighlightedSetting] = useState(null);

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

    const sectionClasses = (id) => [
        'px-6 md:px-10 py-6 space-y-4 transition-shadow duration-300',
        highlightedSection === id ? 'ring-2 ring-ub-orange/60 rounded-xl bg-black/20 shadow-lg' : '',
    ].join(' ');

    const controlClasses = (id, base = 'flex justify-center my-4') => [
        base,
        highlightedSetting === id ? 'ring-2 ring-ub-orange/70 rounded-lg shadow-lg bg-black/20 transition-shadow duration-300' : '',
    ].join(' ');

    useEffect(() => {
        const sectionId = context && context.section;
        const settingId = context && context.settingId;
        if (!sectionId && !settingId) return;
        const refs = {
            appearance: appearanceRef,
            accessibility: accessibilityRef,
            system: systemRef,
            data: dataRef,
        };
        const sectionRef = sectionId && refs[sectionId] ? refs[sectionId].current : null;
        let target = null;
        if (settingId && containerRef.current) {
            target = containerRef.current.querySelector(`[data-setting-id="${settingId}"]`);
        }
        if (!target && sectionRef) {
            target = sectionRef;
        }
        if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setHighlightedSection(sectionId || null);
        setHighlightedSetting(settingId || null);
        if (highlightTimeout.current) {
            clearTimeout(highlightTimeout.current);
        }
        if (typeof window !== 'undefined') {
            highlightTimeout.current = window.setTimeout(() => {
                setHighlightedSection(null);
                setHighlightedSetting(null);
            }, 2400);
        }
    }, [context, appearanceRef, accessibilityRef, systemRef, dataRef]);

    useEffect(() => () => {
        if (highlightTimeout.current) {
            clearTimeout(highlightTimeout.current);
        }
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
        <div
            ref={containerRef}
            className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}
        >
            <section
                ref={appearanceRef}
                data-settings-section="appearance"
                className={sectionClasses('appearance')}
            >
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
                <div data-setting-id="wallpaper" className={controlClasses('wallpaper')}>
                    <label className="mr-2 text-ubt-grey flex items-center">
                        <input
                            type="checkbox"
                            checked={useKaliWallpaper}
                            onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                            className="mr-2"
                        />
                        Kali Gradient Wallpaper
                    </label>
                </div>
                {useKaliWallpaper && (
                    <p
                        className={`text-center text-xs px-6 -mt-2 mb-4 ${highlightedSetting === 'wallpaper' ? 'text-white' : 'text-ubt-grey/70'}`}
                    >
                        Your previous wallpaper selection is preserved for when you turn this off.
                    </p>
                )}
                <div data-setting-id="accent" className={controlClasses('accent', 'flex justify-center my-4 gap-3')}>
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
                <div data-setting-id="density" className={controlClasses('density', 'flex justify-center my-4')}>
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
                <div data-setting-id="font-scale" className={controlClasses('font-scale', 'flex justify-center my-4')}>
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
                    {wallpapers.map((name) => (
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
                            className={`${name === wallpaper ? 'border-yellow-700' : 'border-transparent'} md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80`}
                            style={{ backgroundImage: `url(/wallpapers/${name}.webp)`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' }}
                        ></div>
                    ))}
                </div>
            </section>
            <section
                ref={accessibilityRef}
                data-settings-section="accessibility"
                className={sectionClasses('accessibility')}
            >
                <div data-setting-id="reduced-motion" className={controlClasses('reduced-motion')}>
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
                <div data-setting-id="large-hit-areas" className={controlClasses('large-hit-areas')}>
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
                <div data-setting-id="high-contrast" className={controlClasses('high-contrast')}>
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
            </section>
            <section ref={systemRef} data-settings-section="system" className={sectionClasses('system')}>
                <div data-setting-id="allow-network" className={controlClasses('allow-network')}>
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
                <div data-setting-id="haptics" className={controlClasses('haptics')}>
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
                <div data-setting-id="pong-spin" className={controlClasses('pong-spin')}>
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
            </section>
            <section ref={dataRef} data-settings-section="data" className={sectionClasses('data')}>
                <div data-setting-id="export" className={controlClasses('export', 'flex justify-center my-4')}>
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
                </div>
                <div data-setting-id="import" className={controlClasses('import', 'flex justify-center my-4')}>
                    <button
                        onClick={() => fileInput.current && fileInput.current.click()}
                        className="px-4 py-2 rounded bg-ub-orange text-white"
                    >
                        Import Settings
                    </button>
                </div>
                <div data-setting-id="reset" className={controlClasses('reset', 'flex justify-center my-4')}>
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
