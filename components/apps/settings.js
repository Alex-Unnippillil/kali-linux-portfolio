import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import KaliWallpaper from '../util-components/kali-wallpaper';
import Modal from '../base/Modal';
import Toast from '../ui/Toast';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, useKaliWallpaper, setUseKaliWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [canUndo, setCanUndo] = useState(false);
    const [undoSettings, setUndoSettings] = useState(null);
    const undoTimeoutRef = useRef(null);
    const [resetAnnouncement, setResetAnnouncement] = useState('');
    const resetDescriptionId = 'reset-desktop-description';
    const resetSummaryId = 'reset-desktop-summary';

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

    const resetSummaryItems = [
        'Accent color and wallpaper choices, including the Kali gradient toggle.',
        'Desktop density, font size, and motion or accessibility preferences.',
        'Accessibility options like high contrast mode and large hit areas.',
        'App behavior toggles such as Pong spin, haptics, and network access.',
        'Theme selection and other desktop personalization defaults.',
    ];

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

    useEffect(() => {
        return () => {
            if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
            }
        };
    }, []);

    const handleCancelReset = () => {
        setIsConfirmOpen(false);
    };

    const handleResetConfirm = async () => {
        const previous = {
            accent,
            wallpaper,
            useKaliWallpaper,
            density,
            reducedMotion,
            largeHitAreas,
            fontScale,
            highContrast,
            pongSpin,
            allowNetwork,
            haptics,
            theme: theme || 'default',
        };
        setUndoSettings(previous);
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
        setIsConfirmOpen(false);
        setCanUndo(true);
        setResetAnnouncement('Desktop settings reset to defaults. You can undo for the next 10 seconds.');
        setToastMessage('Desktop settings reset. You can undo for the next 10 seconds.');
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
        }
        undoTimeoutRef.current = setTimeout(() => {
            setCanUndo(false);
            setUndoSettings(null);
            setToastMessage('');
            undoTimeoutRef.current = null;
        }, 10000);
    };

    const handleUndo = () => {
        if (!undoSettings) return;
        setAccent(undoSettings.accent);
        setWallpaper(undoSettings.wallpaper);
        setUseKaliWallpaper(undoSettings.useKaliWallpaper);
        setDensity(undoSettings.density);
        setReducedMotion(undoSettings.reducedMotion);
        setLargeHitAreas(undoSettings.largeHitAreas);
        setFontScale(undoSettings.fontScale);
        setHighContrast(undoSettings.highContrast);
        setPongSpin(undoSettings.pongSpin);
        setAllowNetwork(undoSettings.allowNetwork);
        setHaptics(undoSettings.haptics);
        setTheme(undoSettings.theme || 'default');
        setUndoSettings(null);
        setCanUndo(false);
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }
        setToastMessage('Desktop settings restored.');
        setResetAnnouncement('Desktop settings restored.');
    };

    const handleToastClose = () => {
        setToastMessage('');
        if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }
        if (canUndo) {
            setCanUndo(false);
            setUndoSettings(null);
        }
    };

    return (
        <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-kali-surface text-kali-text">
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
                            aria-checked={accent === c}
                            onClick={() => setAccent(c)}
                            className={`w-8 h-8 rounded-full border-2 ${accent === c ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
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
                        style={{ backgroundColor: accent, color: accentText() }}
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
                            className={`md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 rounded-lg transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${name === wallpaper ? 'border-kali-primary/80 ring-2 ring-kali-primary/40 ring-offset-2 ring-offset-kali-surface' : 'border-transparent hover:border-kali-focus/40'}`}
                            style={{ backgroundImage: `url(/wallpapers/${name}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                        ></div>
                    ))
                }
            </div>
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
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
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
            <div aria-live="polite" role="status" className="sr-only">
                {resetAnnouncement}
            </div>
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    actionLabel={canUndo ? 'Undo' : undefined}
                    onAction={canUndo ? handleUndo : undefined}
                    onClose={handleToastClose}
                    duration={canUndo ? 10000 : undefined}
                />
            )}
            <Modal
                isOpen={isConfirmOpen}
                onClose={handleCancelReset}
                dialogProps={{
                    'aria-labelledby': 'reset-desktop-title',
                    'aria-describedby': `${resetDescriptionId} ${resetSummaryId}`,
                    className: 'fixed inset-0 z-50 flex items-center justify-center p-4',
                }}
            >
                <div className="absolute inset-0 bg-black/70" aria-hidden="true"></div>
                <div className="relative w-full max-w-md space-y-4 rounded-lg bg-kali-surface-raised p-6 text-kali-text shadow-lg">
                    <h2 id="reset-desktop-title" className="text-lg font-semibold">
                        Reset desktop preferences?
                    </h2>
                    <p id={resetDescriptionId} className="text-sm text-kali-text/90">
                        This will clear your personalizations and restore the default Kali desktop experience.
                    </p>
                    <ul id={resetSummaryId} className="list-disc space-y-1 pl-5 text-sm text-kali-text/80">
                        {resetSummaryItems.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleCancelReset}
                            className="rounded-md border border-kali-border/80 bg-kali-surface px-4 py-2 text-kali-text transition-colors hover:border-kali-focus/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleResetConfirm}
                            className="rounded-md bg-kali-primary px-4 py-2 text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                        >
                            Reset desktop
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
