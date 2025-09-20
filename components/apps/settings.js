import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { SOUND_THEMES, useSoundTheme } from '../../hooks/useSoundTheme';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';

const WAVE_SAMPLE_COUNT = 48;

const sampleWaveform = (waveform, progress) => {
    const normalized = progress % 1;
    const angle = normalized * Math.PI * 2;
    switch (waveform) {
        case 'square':
            return Math.sign(Math.sin(angle)) || 0;
        case 'triangle':
            return (2 / Math.PI) * Math.asin(Math.sin(angle));
        case 'sawtooth':
            return 2 * (normalized - Math.floor(normalized + 0.5));
        case 'sine':
        default:
            return Math.sin(angle);
    }
};

const createWavePath = (waveform, amplitude, width, height, phase = 0) => {
    const midY = height / 2;
    const amp = (height / 2 - 4) * Math.min(1, Math.max(0, amplitude));
    let d = '';
    for (let i = 0; i <= WAVE_SAMPLE_COUNT; i += 1) {
        const progress = i / WAVE_SAMPLE_COUNT;
        const value = sampleWaveform(waveform, progress + phase);
        const x = progress * width;
        const y = midY - value * amp;
        d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
};

const WaveformThumbnail = ({ preview, active }) => {
    const width = 96;
    const height = 48;
    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="mt-2 w-full rounded-md bg-black/40"
            role="presentation"
            aria-hidden="true"
        >
            <rect x="0" y="0" width={width} height={height} rx="8" ry="8" fill="rgba(15,19,23,0.7)" />
            {preview.map((tone, index) => (
                <path
                    key={`${tone.band}-${tone.waveform}`}
                    d={createWavePath(tone.waveform, tone.amplitude, width, height, index * 0.35)}
                    stroke={tone.color}
                    strokeWidth={active ? 2.2 : 1.6}
                    strokeLinecap="round"
                    fill="none"
                    opacity={tone.band === 'soft' ? 0.95 : tone.band === 'mid' ? 0.8 : 0.7}
                />
            ))}
        </svg>
    );
};

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme, soundTheme, setSoundTheme, soundThemeVolume, setSoundThemeVolume, audioCues, setAudioCues } = useSettings();
    const { previewTheme } = useSoundTheme({ themeId: soundTheme, volumeMultiplier: soundThemeVolume, enabled: audioCues });
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
            <div className="w-full px-4">
                <div className="mx-auto my-4 max-w-4xl rounded-lg border border-gray-900 bg-black/40 p-4 shadow-inner">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-ubt-grey font-semibold">Sound Theme</h2>
                            <p className="text-xs text-ubt-grey/70">
                                Map notification categories to low, mid, and soft tones for quick recognition.
                            </p>
                        </div>
                        <label className="flex items-center gap-2 text-ubt-grey text-sm">
                            <input
                                type="checkbox"
                                checked={audioCues}
                                onChange={(e) => setAudioCues(e.target.checked)}
                                className="h-4 w-4"
                            />
                            Enable audio cues
                        </label>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {SOUND_THEMES.map((themeOption) => {
                            const isActive = themeOption.id === soundTheme;
                            return (
                                <button
                                    key={themeOption.id}
                                    type="button"
                                    onClick={() => setSoundTheme(themeOption.id)}
                                    className={`group flex flex-col rounded-lg border px-3 py-3 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 ${isActive ? 'border-ub-orange bg-black/60 shadow-lg shadow-orange-500/20' : 'border-gray-800/80 hover:border-orange-400 hover:bg-black/50'}`}
                                >
                                    <span className="text-sm font-semibold text-ubt-grey">{themeOption.label}</span>
                                    <WaveformThumbnail preview={themeOption.preview} active={isActive} />
                                    <span className="mt-2 text-xs text-ubt-grey/70">{themeOption.description}</span>
                                    <div className="mt-3 flex items-center justify-between text-xs text-ubt-grey/60">
                                        <span>{isActive ? 'Selected' : 'Tap to select'}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                previewTheme(themeOption.id);
                                            }}
                                            disabled={!audioCues}
                                            className={`rounded px-2 py-1 font-semibold transition ${audioCues ? 'bg-orange-500/20 text-ub-orange hover:bg-orange-500/30 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-orange-400' : 'cursor-not-allowed bg-gray-800/60 text-gray-500'}`}
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                        <label htmlFor="sound-theme-volume" className="text-sm text-ubt-grey md:w-40">
                            Cue loudness
                        </label>
                        <div className="flex flex-1 items-center gap-3">
                            <input
                                id="sound-theme-volume"
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={soundThemeVolume}
                                onChange={(e) => setSoundThemeVolume(parseFloat(e.target.value))}
                                disabled={!audioCues}
                                className="ubuntu-slider flex-1"
                            />
                            <span className="w-12 text-right text-xs text-ubt-grey/70">{Math.round(soundThemeVolume * 100)}%</span>
                        </div>
                    </div>
                </div>
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
                        setSoundTheme(defaults.soundTheme);
                        setSoundThemeVolume(defaults.soundThemeVolume);
                        setAudioCues(defaults.audioCues);
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
                        if (parsed.soundTheme !== undefined) setSoundTheme(parsed.soundTheme);
                        if (parsed.soundThemeVolume !== undefined) setSoundThemeVolume(parsed.soundThemeVolume);
                        if (parsed.audioCues !== undefined) setAudioCues(parsed.audioCues);
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
