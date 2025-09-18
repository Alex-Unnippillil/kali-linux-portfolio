import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { z } from 'zod';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import { resetSettings, defaults, exportSettings as exportSettingsData, importSettings as importSettingsData } from '../../utils/settingsStore';
import Modal from '../base/Modal';

const BASE_SETTINGS_SCHEMA = z.object({
    accent: z.string({ invalid_type_error: 'Accent must be a string.' }).regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, {
        message: 'Accent must be a hex color (example: #1793d1).',
    }),
    wallpaper: z.string({ invalid_type_error: 'Wallpaper must be a string.' }).min(1, { message: 'Wallpaper cannot be empty.' }),
    density: z.enum(['regular', 'compact'], { message: 'Density must be either "regular" or "compact".' }),
    reducedMotion: z.boolean({ invalid_type_error: 'Reduced motion must be a boolean.' }),
    fontScale: z.number({ invalid_type_error: 'Font scale must be a number.' }).min(0.5, { message: 'Font scale must be at least 0.5.' }).max(2, { message: 'Font scale must be 2.0 or less.' }),
    highContrast: z.boolean({ invalid_type_error: 'High contrast must be a boolean.' }),
    largeHitAreas: z.boolean({ invalid_type_error: 'Large hit areas must be a boolean.' }),
    pongSpin: z.boolean({ invalid_type_error: 'Pong spin must be a boolean.' }),
    allowNetwork: z.boolean({ invalid_type_error: 'Allow network requests must be a boolean.' }),
    haptics: z.boolean({ invalid_type_error: 'Haptics must be a boolean.' }),
    theme: z.enum(['default', 'dark', 'neon', 'matrix'], { message: 'Theme must be one of default, dark, neon, or matrix.' }),
});

const IMPORT_SETTINGS_SCHEMA = BASE_SETTINGS_SCHEMA.partial().strict();

const SETTINGS_KEY_ORDER = [
    'accent',
    'wallpaper',
    'density',
    'reducedMotion',
    'fontScale',
    'highContrast',
    'largeHitAreas',
    'pongSpin',
    'allowNetwork',
    'haptics',
    'theme',
];

const sortSettingsKeys = (settings) => {
    const ordered = {};
    SETTINGS_KEY_ORDER.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
            ordered[key] = settings[key];
        }
    });
    Object.keys(settings).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
            ordered[key] = settings[key];
        }
    });
    return ordered;
};

const formatSettings = (settings) => JSON.stringify(sortSettingsKeys(settings), null, 2);

const formatSchemaIssues = (issues) => issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
}).join('\n');

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);
    const [importError, setImportError] = useState('');
    const [applyError, setApplyError] = useState('');
    const [pendingSettings, setPendingSettings] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const currentSettings = useMemo(() => ({
        accent,
        wallpaper,
        density,
        reducedMotion,
        fontScale,
        highContrast,
        largeHitAreas,
        pongSpin,
        allowNetwork,
        haptics,
        theme,
    }), [accent, wallpaper, density, reducedMotion, fontScale, highContrast, largeHitAreas, pongSpin, allowNetwork, haptics, theme]);

    const diffValues = useMemo(() => {
        if (!pendingSettings) return null;
        const merged = { ...currentSettings, ...pendingSettings };
        const oldValue = formatSettings(currentSettings);
        const newValue = formatSettings(merged);
        return {
            oldValue,
            newValue,
            hasChanges: oldValue !== newValue,
        };
    }, [currentSettings, pendingSettings]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setPendingSettings(null);
        setApplyError('');
    }, [setIsModalOpen, setPendingSettings, setApplyError]);

    const applyLocalSettings = useCallback((settings) => {
        if (settings.accent !== undefined) setAccent(settings.accent);
        if (settings.wallpaper !== undefined) setWallpaper(settings.wallpaper);
        if (settings.density !== undefined) setDensity(settings.density);
        if (settings.reducedMotion !== undefined) setReducedMotion(settings.reducedMotion);
        if (settings.fontScale !== undefined) setFontScale(settings.fontScale);
        if (settings.highContrast !== undefined) setHighContrast(settings.highContrast);
        if (settings.largeHitAreas !== undefined) setLargeHitAreas(settings.largeHitAreas);
        if (settings.pongSpin !== undefined) setPongSpin(settings.pongSpin);
        if (settings.allowNetwork !== undefined) setAllowNetwork(settings.allowNetwork);
        if (settings.haptics !== undefined) setHaptics(settings.haptics);
        if (settings.theme !== undefined) setTheme(settings.theme);
    }, [setAccent, setWallpaper, setDensity, setReducedMotion, setFontScale, setHighContrast, setLargeHitAreas, setPongSpin, setAllowNetwork, setHaptics, setTheme]);

    const handleApplyPending = useCallback(async () => {
        if (!pendingSettings) return;
        setIsApplying(true);
        setApplyError('');
        try {
            await importSettingsData(pendingSettings);
            applyLocalSettings(pendingSettings);
            closeModal();
        } catch (err) {
            console.error('Failed to apply imported settings', err);
            setApplyError('Unable to apply settings. Please try again.');
        } finally {
            setIsApplying(false);
        }
    }, [pendingSettings, applyLocalSettings, closeModal]);

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

    const handleImportChange = useCallback(async (event) => {
        const { files } = event.target;
        const file = files && files[0];
        if (!file) return;
        setImportError('');
        setApplyError('');
        try {
            const text = await file.text();
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (jsonErr) {
                throw new Error('File is not valid JSON.');
            }
            const result = IMPORT_SETTINGS_SCHEMA.safeParse(parsed);
            if (!result.success) {
                throw new Error(formatSchemaIssues(result.error.issues));
            }
            if (Object.keys(result.data).length === 0) {
                throw new Error('The file does not contain any supported settings.');
            }
            setPendingSettings(result.data);
            setIsModalOpen(true);
        } catch (error) {
            const message = error instanceof Error && error.message ? error.message : 'Unexpected error while reading settings.';
            setPendingSettings(null);
            setIsModalOpen(false);
            setImportError(`Import failed: ${message}`);
        } finally {
            event.target.value = '';
        }
    }, [setImportError, setApplyError, setPendingSettings, setIsModalOpen]);

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
        <>
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
                        wallpapers.map((name) => (
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
                <div className="flex flex-col items-center justify-center gap-2 border-t border-gray-900 pt-4 sm:flex-row sm:space-x-4">
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
                        className="px-4 py-2 rounded bg-ub-orange text-white font-semibold"
                    >
                        Export Settings
                    </button>
                    <button
                        onClick={() => {
                            setImportError('');
                            setApplyError('');
                            if (fileInput.current) {
                                fileInput.current.click();
                            }
                        }}
                        className="px-4 py-2 rounded bg-ub-orange text-white font-semibold"
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
                            setTheme('default');
                        }}
                        className="px-4 py-2 rounded bg-ub-orange text-white font-semibold"
                    >
                        Reset Desktop
                    </button>
                </div>
                {importError && (
                    <div role="alert" className="mx-auto mt-3 w-11/12 max-w-3xl rounded border border-red-500/40 bg-red-900/40 px-3 py-2 text-center text-sm text-red-200 whitespace-pre-line">
                        {importError}
                    </div>
                )}
                <input
                    type="file"
                    accept="application/json"
                    ref={fileInput}
                    onChange={handleImportChange}
                    aria-label="Import settings file"
                    className="hidden"
                />
            </div>
            <Modal isOpen={isModalOpen} onClose={closeModal}>
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4">
                    <div
                        className="max-h-full w-full max-w-5xl overflow-hidden rounded-lg border border-gray-800 bg-ub-cool-grey text-white shadow-2xl"
                        role="document"
                        aria-labelledby="settings-import-title"
                    >
                        <div className="flex flex-col gap-4 p-4">
                            <div className="flex flex-col gap-2 border-b border-gray-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 id="settings-import-title" className="text-lg font-semibold">Review imported settings</h2>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="self-start rounded bg-transparent px-3 py-1 text-sm text-ubt-grey transition hover:bg-ub-dark-400 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                                >
                                    Close
                                </button>
                            </div>
                            {diffValues ? (
                                diffValues.hasChanges ? (
                                    <ReactDiffViewer
                                        oldValue={diffValues.oldValue}
                                        newValue={diffValues.newValue}
                                        splitView
                                        useDarkTheme
                                        showDiffOnly={false}
                                        hideLineNumbers={false}
                                        leftTitle="Current settings"
                                        rightTitle="Imported settings"
                                    />
                                ) : (
                                    <div className="rounded border border-ubt-cool-grey bg-ub-dark-400/70 p-4 text-center text-ubt-grey">
                                        No differences detected; applying will keep your current configuration.
                                    </div>
                                )
                            ) : (
                                <div className="rounded border border-ubt-cool-grey bg-ub-dark-400/70 p-4 text-center text-ubt-grey">
                                    Unable to generate a preview for this file.
                                </div>
                            )}
                            {applyError && (
                                <div role="alert" className="rounded border border-red-500/40 bg-red-900/40 px-3 py-2 text-sm text-red-200 whitespace-pre-line">
                                    {applyError}
                                </div>
                            )}
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded bg-transparent px-4 py-2 text-ubt-grey transition hover:bg-ub-dark-400 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyPending}
                                    disabled={isApplying}
                                    className="rounded bg-ub-orange px-4 py-2 font-semibold text-white transition disabled:opacity-60"
                                >
                                    {isApplying ? 'Applying…' : 'Apply import'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
