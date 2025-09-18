import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    useSettings,
    ACCENT_OPTIONS,
    BODY_FONT_OPTIONS,
    CODE_FONT_OPTIONS,
    ANTIALIASING_OPTIONS,
    HINTING_OPTIONS,
} from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';

const findOption = (options, id) => options.find((option) => option.id === id) || options[0];

const TypographyPreview = ({
    accent,
    accentTextColor,
    contrast,
    liveRegionRef,
    bodyFont,
    codeFont,
    antialiasing,
    hinting,
}) => {
    const bodyOption = findOption(BODY_FONT_OPTIONS, bodyFont);
    const codeOption = findOption(CODE_FONT_OPTIONS, codeFont);
    const antialiasingOption = findOption(ANTIALIASING_OPTIONS, antialiasing);
    const hintingOption = findOption(HINTING_OPTIONS, hinting);

    return (
        <section
            aria-label="Typography preview"
            className="w-full max-w-3xl mx-auto my-6 p-4 rounded border border-gray-900 bg-ub-dark text-ubt-grey space-y-3 shadow-inner"
        >
            <h3 className="text-lg font-semibold text-ubt-grey">Live typography preview</h3>
            <p
                className="leading-relaxed text-base"
                style={{ fontFamily: bodyOption.stack }}
            >
                {bodyOption.sample}
            </p>
            <pre
                className="p-3 rounded border border-gray-900 overflow-x-auto text-sm"
                style={{
                    fontFamily: codeOption.stack,
                    lineHeight: '1.4',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                }}
            >
                <code>{codeOption.sample}</code>
            </pre>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <button
                    className="px-3 py-1 rounded font-semibold"
                    style={{ backgroundColor: accent, color: accentTextColor }}
                >
                    Accent button
                </button>
                <p className={`text-sm ${contrast >= 4.5 ? 'text-green-400' : 'text-red-400'}`}>
                    {`Contrast ${contrast.toFixed(2)}:1 ${contrast >= 4.5 ? 'Pass' : 'Fail'}`}
                </p>
            </div>
            <p className="text-xs text-ubt-grey" style={{ opacity: 0.8 }}>
                {`${bodyOption.label} body · ${codeOption.label} code`}
                <br />
                {`Antialiasing: ${antialiasingOption.label} • Hinting: ${hintingOption.label}`}
            </p>
            <span ref={liveRegionRef} role="status" aria-live="polite" className="sr-only"></span>
        </section>
    );
};

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
        bodyFont,
        setBodyFont,
        codeFont,
        setCodeFont,
        antialiasing,
        setAntialiasing,
        hinting,
        setHinting,
        theme,
        setTheme,
    } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

    const bodyFontOption = findOption(BODY_FONT_OPTIONS, bodyFont);
    const codeFontOption = findOption(CODE_FONT_OPTIONS, codeFont);
    const antialiasingOption = findOption(ANTIALIASING_OPTIONS, antialiasing);
    const hintingOption = findOption(HINTING_OPTIONS, hinting);

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

    const accentTextColor = accentText();

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
            <div className="flex flex-col items-center my-4 space-y-2">
                <div className="flex justify-center items-center">
                    <label className="mr-2 text-ubt-grey">Body Font:</label>
                    <select
                        value={bodyFont}
                        onChange={(e) => setBodyFont(e.target.value)}
                        className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                    >
                        {BODY_FONT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-center text-ubt-grey" style={{ opacity: 0.75 }}>
                    {bodyFontOption.sample}
                </p>
            </div>
            <div className="flex flex-col items-center my-4 space-y-2">
                <div className="flex justify-center items-center">
                    <label className="mr-2 text-ubt-grey">Code Font:</label>
                    <select
                        value={codeFont}
                        onChange={(e) => setCodeFont(e.target.value)}
                        className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                    >
                        {CODE_FONT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-center text-ubt-grey" style={{ opacity: 0.75 }}>
                    {codeFontOption.sample}
                </p>
            </div>
            <div className="flex flex-col items-center my-4 space-y-2">
                <div className="flex justify-center items-center">
                    <label className="mr-2 text-ubt-grey">Antialiasing:</label>
                    <select
                        value={antialiasing}
                        onChange={(e) => setAntialiasing(e.target.value)}
                        className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                    >
                        {ANTIALIASING_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-center text-ubt-grey" style={{ opacity: 0.75 }}>
                    {antialiasingOption.description}
                </p>
            </div>
            <div className="flex flex-col items-center my-4 space-y-2">
                <div className="flex justify-center items-center">
                    <label className="mr-2 text-ubt-grey">Hinting:</label>
                    <select
                        value={hinting}
                        onChange={(e) => setHinting(e.target.value)}
                        className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                    >
                        {HINTING_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-center text-ubt-grey" style={{ opacity: 0.75 }}>
                    {hintingOption.description}
                </p>
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
            <TypographyPreview
                accent={accent}
                accentTextColor={accentTextColor}
                contrast={contrast}
                liveRegionRef={liveRegion}
                bodyFont={bodyFont}
                codeFont={codeFont}
                antialiasing={antialiasing}
                hinting={hinting}
            />
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
                        setAllowNetwork(defaults.allowNetwork);
                        setHaptics(defaults.haptics);
                        setPongSpin(defaults.pongSpin);
                        setBodyFont(defaults.bodyFont);
                        setCodeFont(defaults.codeFont);
                        setAntialiasing(defaults.antialiasing);
                        setHinting(defaults.hinting);
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
                        if (parsed.fontScale !== undefined) setFontScale(parsed.fontScale);
                        if (parsed.largeHitAreas !== undefined) setLargeHitAreas(parsed.largeHitAreas);
                        if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
                        if (parsed.allowNetwork !== undefined) setAllowNetwork(parsed.allowNetwork);
                        if (parsed.haptics !== undefined) setHaptics(parsed.haptics);
                        if (parsed.pongSpin !== undefined) setPongSpin(parsed.pongSpin);
                        if (parsed.bodyFont !== undefined) setBodyFont(parsed.bodyFont);
                        if (parsed.codeFont !== undefined) setCodeFont(parsed.codeFont);
                        if (parsed.antialiasing !== undefined) setAntialiasing(parsed.antialiasing);
                        if (parsed.hinting !== undefined) setHinting(parsed.hinting);
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
