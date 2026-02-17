import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import {
    resetSettings,
    defaults,
    exportSettings as exportSettingsData,
    importSettings as importSettingsData,
} from '../../utils/settingsStore';
import { writeRecentAppIds } from '../../utils/recentStorage';
import { useKeymap, KEYMAP_STORAGE_KEY } from '../../apps/settings/keymapRegistry';
import { formatShortcutEvent } from '../../utils/shortcuts';
import KaliWallpaper from '../util-components/kali-wallpaper';

const THEMES = ['default', 'dark', 'neon', 'matrix'];
const WALLPAPERS = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

const SECTION_KEYWORDS = {
    appearance: ['appearance', 'theme', 'accent', 'wallpaper', 'density', 'background', 'visual'],
    accessibility: ['accessibility', 'font', 'contrast', 'motion', 'hit', 'keyboard', 'focus'],
    interaction: ['interaction', 'effects', 'pong', 'spin', 'animation', 'shortcut', 'key binding'],
    audio: ['audio', 'sound', 'volume', 'haptics', 'feedback'],
    privacy: ['privacy', 'network', 'requests', 'data', 'export', 'import', 'reset', 'launcher'],
};

const normalizeText = (value = '') => value.toString().toLowerCase();

const isKeymapRecord = (value) => {
    return (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.values(value).every((entry) => typeof entry === 'string')
    );
};

export function Settings() {
    const {
        accent,
        setAccent,
        wallpaper,
        setWallpaper,
        useKaliWallpaper,
        setUseKaliWallpaper,
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
        volume,
        setVolume,
        theme,
        setTheme,
    } = useSettings();
    const [contrast, setContrast] = useState(0);
    const [query, setQuery] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [recordingShortcut, setRecordingShortcut] = useState('');
    const { shortcuts, updateShortcut, resetKeymap } = useKeymap();
    const liveRegion = useRef(null);
    const fileInput = useRef(null);
    const statusTimeout = useRef(null);

    const changeBackgroundImage = (name) => {
        setWallpaper(name);
    };

    const reportStatus = (message) => {
        setStatusMessage(message);
        if (statusTimeout.current) {
            clearTimeout(statusTimeout.current);
        }
        statusTimeout.current = setTimeout(() => {
            setStatusMessage('');
        }, 4000);
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
        let a = [r, g, b].map((v) => {
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
        return contrastRatio(accent, '#000000') > contrastRatio(accent, '#ffffff')
            ? '#000000'
            : '#ffffff';
    }, [accent, contrastRatio]);

    const normalizedQuery = normalizeText(query.trim());
    const matchesQuery = (...values) => {
        if (!normalizedQuery) return true;
        return values.some((value) => normalizeText(value).includes(normalizedQuery));
    };

    const showAppearance = matchesQuery(...SECTION_KEYWORDS.appearance);
    const showAccessibility = matchesQuery(...SECTION_KEYWORDS.accessibility);
    const showInteraction = matchesQuery(...SECTION_KEYWORDS.interaction);
    const showAudio = matchesQuery(...SECTION_KEYWORDS.audio);
    const showPrivacy = matchesQuery(...SECTION_KEYWORDS.privacy);
    const hasResults = showAppearance || showAccessibility || showInteraction || showAudio || showPrivacy;

    const keyCounts = shortcuts.reduce((map, shortcut) => {
        if (!shortcut.keys) return map;
        map.set(shortcut.keys, (map.get(shortcut.keys) || 0) + 1);
        return map;
    }, new Map());
    const conflicts = new Set(
        Array.from(keyCounts.entries())
            .filter(([, count]) => count > 1)
            .map(([shortcut]) => shortcut)
    );

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
        if (!recordingShortcut) return undefined;

        const handleRecordShortcut = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setRecordingShortcut('');
                return;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                event.stopPropagation();
                updateShortcut(recordingShortcut, '');
                setRecordingShortcut('');
                return;
            }

            const formatted = formatShortcutEvent(event);
            if (!formatted) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            updateShortcut(recordingShortcut, formatted);
            setRecordingShortcut('');
        };

        window.addEventListener('keydown', handleRecordShortcut, true);
        return () => window.removeEventListener('keydown', handleRecordShortcut, true);
    }, [recordingShortcut, updateShortcut]);

    useEffect(() => {
        return () => {
            if (statusTimeout.current) {
                clearTimeout(statusTimeout.current);
            }
        };
    }, []);

    return (
        <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-kali-surface text-kali-text">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6">
                <header className="flex flex-col gap-4 rounded-2xl border border-kali-border/60 bg-kali-surface-raised px-6 py-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-kali-text/60">Settings</p>
                            <h2 className="text-2xl font-semibold text-kali-text">Personalize your desktop</h2>
                            <p className="mt-2 text-sm text-kali-text/70">
                                Tune the visual style, accessibility, and system behavior of your Kali-inspired workspace.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <label className="text-xs uppercase tracking-wide text-kali-text/60" htmlFor="settings-search">
                                Search settings
                            </label>
                            <input
                                id="settings-search"
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Try “accent”, “volume”, “wallpaper”..."
                                aria-label="Search settings"
                                className="w-64 rounded-lg border border-kali-border/60 bg-kali-surface-muted px-3 py-2 text-sm text-kali-text/90 placeholder:text-kali-text/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={async () => {
                                const settingsData = await exportSettingsData();
                                let parsedSettings = {};
                                try {
                                    parsedSettings = JSON.parse(settingsData);
                                } catch (error) {
                                    parsedSettings = {};
                                }

                                let parsedKeymap = {};
                                try {
                                    const storedKeymap = window.localStorage.getItem(KEYMAP_STORAGE_KEY);
                                    const candidate = storedKeymap ? JSON.parse(storedKeymap) : {};
                                    parsedKeymap = isKeymapRecord(candidate) ? candidate : {};
                                } catch (error) {
                                    parsedKeymap = {};
                                }

                                const data = JSON.stringify(
                                    {
                                        ...parsedSettings,
                                        keymap: parsedKeymap,
                                    },
                                    null,
                                    2
                                );
                                const blob = new Blob([data], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'settings.json';
                                a.click();
                                URL.revokeObjectURL(url);
                                reportStatus('Settings exported to settings.json');
                            }}
                            className="rounded-lg bg-kali-primary px-4 py-2 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                        >
                            Export
                        </button>
                        <button
                            onClick={() => fileInput.current && fileInput.current.click()}
                            className="rounded-lg bg-kali-surface-muted px-4 py-2 text-sm font-medium text-kali-text/80 transition-colors hover:bg-kali-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                        >
                            Import
                        </button>
                        <button
                            onClick={async () => {
                                if (!window.confirm('Reset desktop personalization and settings?')) return;
                                await resetSettings();
                                resetKeymap();
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
                                setVolume(defaults.volume);
                                setTheme('default');
                                reportStatus('All settings restored to defaults');
                            }}
                            className="rounded-lg border border-kali-border/60 bg-kali-surface-muted px-4 py-2 text-sm font-medium text-kali-text/80 transition-colors hover:border-kali-focus/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => {
                                if (!window.confirm('Clear launcher suggested apps?')) return;
                                writeRecentAppIds([]);
                                reportStatus('Launcher suggestions cleared');
                            }}
                            className="rounded-lg border border-kali-border/60 bg-kali-surface-muted px-4 py-2 text-sm font-medium text-kali-text/80 transition-colors hover:border-kali-focus/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                        >
                            Clear Suggestions
                        </button>
                        {statusMessage && (
                            <span className="rounded-full bg-kali-surface-muted px-3 py-1 text-xs text-kali-text/70">
                                {statusMessage}
                            </span>
                        )}
                    </div>
                </header>

                {!hasResults && (
                    <div className="rounded-2xl border border-dashed border-kali-border/60 bg-kali-surface-muted px-6 py-6 text-center text-sm text-kali-text/70">
                        No matching settings found. Try a different keyword.
                    </div>
                )}

                {showAppearance && (
                    <section className="flex flex-col gap-6" aria-label="Appearance settings">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-kali-text/60">Appearance</p>
                            <h3 className="text-lg font-semibold text-kali-text">Theme & visuals</h3>
                            <p className="mt-1 text-sm text-kali-text/70">
                                Choose a theme, accent, and wallpaper that match your vibe.
                            </p>
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-5">
                                <p className="text-sm font-medium text-kali-text">Theme presets</p>
                                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {THEMES.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setTheme(option)}
                                            className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-xs uppercase tracking-wide transition-colors ${
                                                theme === option
                                                    ? 'border-kali-primary/80 bg-kali-surface-raised text-kali-primary'
                                                    : 'border-kali-border/60 bg-kali-surface-muted text-kali-text/70 hover:border-kali-focus/60'
                                            }`}
                                            aria-pressed={theme === option}
                                        >
                                            <span
                                                className={`h-10 w-16 rounded-md border ${
                                                    option === 'default'
                                                        ? 'bg-gray-100 border-gray-200'
                                                        : option === 'dark'
                                                            ? 'bg-gray-900 border-gray-700'
                                                            : option === 'neon'
                                                                ? 'bg-black border-fuchsia-500/60'
                                                                : 'bg-black border-green-500/60'
                                                }`}
                                            />
                                            <span>{option}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-6 flex flex-col gap-4">
                                    <div>
                                        <label className="text-sm text-kali-text/80" id="accent-picker-label">
                                            Accent color
                                        </label>
                                        <div
                                            aria-labelledby="accent-picker-label"
                                            role="radiogroup"
                                            className="mt-2 flex flex-wrap gap-2"
                                        >
                                            {ACCENT_OPTIONS.map((c) => (
                                                <button
                                                    key={c}
                                                    aria-label={`select-accent-${c}`}
                                                    role="radio"
                                                    aria-checked={accent === c}
                                                    onClick={() => setAccent(c)}
                                                    className={`h-9 w-9 rounded-full border-2 transition ${
                                                        accent === c
                                                            ? 'border-white ring-2 ring-kali-primary/30'
                                                            : 'border-transparent hover:border-kali-focus/60'
                                                    }`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="flex flex-col gap-2 text-sm text-kali-text/80" htmlFor="density-select">
                                            Density
                                            <select
                                                id="density-select"
                                                value={density}
                                                onChange={(e) => setDensity(e.target.value)}
                                                className="rounded-md border border-kali-border/70 bg-kali-surface-muted px-2 py-2 text-sm text-kali-text transition-colors hover:border-kali-focus/60 focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-surface"
                                            >
                                                <option value="regular">Regular</option>
                                                <option value="compact">Compact</option>
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-2 text-sm text-kali-text/80" htmlFor="font-scale-slider">
                                            Font size ({Math.round(fontScale * 100)}%)
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
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-5">
                                <p className="text-sm font-medium text-kali-text">Live preview</p>
                                <div className="mt-4 overflow-hidden rounded-lg border border-kali-border/60">
                                    <div className="h-32 w-full bg-cover bg-center" aria-hidden="true">
                                        {useKaliWallpaper ? (
                                            <KaliWallpaper />
                                        ) : (
                                            <div
                                                className="h-full w-full"
                                                style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)` }}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-col gap-3 text-sm text-kali-text/70">
                                    <label className="flex items-center gap-2 text-kali-text/80">
                                        <input
                                            type="checkbox"
                                            checked={useKaliWallpaper}
                                            onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                                            className="h-4 w-4 rounded border-kali-border/60"
                                            aria-label="Enable Kali gradient wallpaper"
                                        />
                                        Kali gradient wallpaper
                                    </label>
                                    {useKaliWallpaper && (
                                        <p className="text-xs text-kali-text/60">
                                            Your previous wallpaper selection is preserved for when you turn this off.
                                        </p>
                                    )}
                                    <div className="rounded-lg border border-kali-border/60 bg-kali-surface-muted p-3">
                                        <p className="text-xs uppercase tracking-wide text-kali-text/60">Accent contrast</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <button
                                                className="rounded px-3 py-2 text-sm font-medium"
                                                style={{ backgroundColor: accent, color: accentText() }}
                                            >
                                                Accent preview
                                            </button>
                                            <span
                                                className={`text-sm ${contrast >= 4.5 ? 'text-kali-primary' : 'text-kali-error'}`}
                                            >
                                                {contrast.toFixed(2)}:1 {contrast >= 4.5 ? 'Pass' : 'Fail'}
                                            </span>
                                        </div>
                                        <span ref={liveRegion} role="status" aria-live="polite" className="sr-only"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-medium text-kali-text">Wallpaper gallery</p>
                                    <p className="text-xs text-kali-text/60">Pick a background for your desktop.</p>
                                </div>
                                <span className="text-xs text-kali-text/60">Selected: {wallpaper.replace('wall-', 'Wallpaper ')}</span>
                            </div>
                            <div className="mt-4 flex flex-wrap justify-center gap-3">
                                {WALLPAPERS.map((name) => (
                                    <button
                                        key={name}
                                        type="button"
                                        aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
                                        aria-pressed={name === wallpaper}
                                        onClick={() => changeBackgroundImage(name)}
                                        className={`outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                                            name === wallpaper
                                                ? 'rounded-lg border-2 border-kali-primary/80 ring-2 ring-kali-primary/40 ring-offset-2 ring-offset-kali-surface'
                                                : 'rounded-lg border-2 border-transparent hover:border-kali-focus/40'
                                        }`}
                                    >
                                        <img
                                            src={`/wallpapers/${name}.webp`}
                                            alt={name.replace('wall-', 'Wallpaper ')}
                                            className="h-24 w-36 rounded object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {showAccessibility && (
                    <section className="flex flex-col gap-6" aria-label="Accessibility settings">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-kali-text/60">Accessibility</p>
                            <h3 className="text-lg font-semibold text-kali-text">Comfort & readability</h3>
                            <p className="mt-1 text-sm text-kali-text/70">
                                Adjust motion, contrast, and hit targets to suit your needs.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="flex items-start gap-3 rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text/80">
                                <input
                                    type="checkbox"
                                    checked={reducedMotion}
                                    onChange={(e) => setReducedMotion(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-kali-border/60"
                                    aria-label="Enable reduced motion"
                                />
                                <span>
                                    <span className="font-medium text-kali-text">Reduced motion</span>
                                    <span className="mt-1 block text-xs text-kali-text/60">
                                        Minimizes animations and transitions across the desktop.
                                    </span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text/80">
                                <input
                                    type="checkbox"
                                    checked={largeHitAreas}
                                    onChange={(e) => setLargeHitAreas(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-kali-border/60"
                                    aria-label="Enable large hit areas"
                                />
                                <span>
                                    <span className="font-medium text-kali-text">Large hit areas</span>
                                    <span className="mt-1 block text-xs text-kali-text/60">
                                        Makes buttons and controls easier to tap or click.
                                    </span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text/80">
                                <input
                                    type="checkbox"
                                    checked={highContrast}
                                    onChange={(e) => setHighContrast(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-kali-border/60"
                                    aria-label="Enable high contrast mode"
                                />
                                <span>
                                    <span className="font-medium text-kali-text">High contrast</span>
                                    <span className="mt-1 block text-xs text-kali-text/60">
                                        Boosts contrast for better legibility.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </section>
                )}

                {showInteraction && (
                    <section className="flex flex-col gap-6" aria-label="Interaction settings">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-kali-text/60">Interaction</p>
                            <h3 className="text-lg font-semibold text-kali-text">Motion & effects</h3>
                            <p className="mt-1 text-sm text-kali-text/70">
                                Fine-tune playful effects for games and simulations.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="flex items-start gap-3 rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text/80">
                                <input
                                    type="checkbox"
                                    checked={pongSpin}
                                    onChange={(e) => setPongSpin(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-kali-border/60"
                                    aria-label="Enable pong spin"
                                />
                                <span>
                                    <span className="font-medium text-kali-text">Pong spin effect</span>
                                    <span className="mt-1 block text-xs text-kali-text/60">
                                        Adds rotational flair to pong gameplay.
                                    </span>
                                </span>
                            </label>
                        </div>

                        <div className="rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-kali-text">Keyboard shortcuts</p>
                                    <p className="mt-1 text-xs text-kali-text/60">View and customize desktop key bindings.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetKeymap();
                                        setRecordingShortcut('');
                                    }}
                                    className="rounded-lg border border-kali-border/60 bg-kali-surface-muted px-3 py-1.5 text-xs font-medium text-kali-text/80 transition-colors hover:border-kali-focus/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                                >
                                    Reset shortcuts
                                </button>
                            </div>
                            <ul className="mt-4 space-y-2" aria-label="Shortcut bindings">
                                {shortcuts.map((shortcut) => {
                                    const isRecording = recordingShortcut === shortcut.description;
                                    const hasConflict = shortcut.keys && conflicts.has(shortcut.keys);

                                    return (
                                        <li
                                            key={shortcut.description}
                                            data-conflict={hasConflict ? 'true' : 'false'}
                                            className="rounded-lg border border-kali-border/50 bg-kali-surface-muted px-3 py-3"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="min-w-[220px] flex-1">
                                                    <p className="text-sm font-medium text-kali-text">{shortcut.description}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        <span className="rounded bg-black/30 px-2 py-0.5 font-mono text-xs text-kali-text/90">
                                                            {shortcut.keys || 'Unassigned'}
                                                        </span>
                                                        {hasConflict && (
                                                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-200">
                                                                Conflict
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isRecording && (
                                                        <p className="mt-2 text-xs text-kali-text/70">Press keys… Esc to cancel.</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRecordingShortcut(isRecording ? '' : shortcut.description)}
                                                        className="rounded-lg bg-kali-primary px-3 py-1.5 text-xs font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                                                    >
                                                        {isRecording ? 'Cancel' : 'Record'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            updateShortcut(shortcut.description, '');
                                                            if (isRecording) {
                                                                setRecordingShortcut('');
                                                            }
                                                        }}
                                                        className="rounded-lg border border-kali-border/60 bg-kali-surface-muted px-3 py-1.5 text-xs font-medium text-kali-text/80 transition-colors hover:border-kali-focus/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                            <p className="mt-3 text-xs text-kali-text/60">Shortcuts do not fire while typing in inputs.</p>
                        </div>
                    </section>
                )}

                {showAudio && (
                    <section className="flex flex-col gap-6" aria-label="Audio settings">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-kali-text/60">Audio & feedback</p>
                            <h3 className="text-lg font-semibold text-kali-text">Sound and touch</h3>
                            <p className="mt-1 text-sm text-kali-text/70">
                                Control audio volume and haptic cues across apps.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label
                                className="flex flex-col gap-2 rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text/80"
                                htmlFor="volume-slider"
                            >
                                Volume ({volume}%)
                                <input
                                    id="volume-slider"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={volume}
                                    onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                                    className="kali-slider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-surface"
                                    aria-label="Adjust master volume"
                                />
                            </label>
                            <label className="flex items-start gap-3 rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text/80">
                                <input
                                    type="checkbox"
                                    checked={haptics}
                                    onChange={(e) => setHaptics(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-kali-border/60"
                                    aria-label="Enable haptics"
                                />
                                <span>
                                    <span className="font-medium text-kali-text">Haptics</span>
                                    <span className="mt-1 block text-xs text-kali-text/60">
                                        Enables subtle vibration feedback on supported devices.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </section>
                )}

                {showPrivacy && (
                    <section className="flex flex-col gap-6" aria-label="Privacy and data settings">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-kali-text/60">Privacy & system</p>
                            <h3 className="text-lg font-semibold text-kali-text">Network and data handling</h3>
                            <p className="mt-1 text-sm text-kali-text/70">
                                Manage local data, exports, and simulated network access.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="flex items-start gap-3 rounded-2xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text/80">
                                <input
                                    type="checkbox"
                                    checked={allowNetwork}
                                    onChange={(e) => setAllowNetwork(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-kali-border/60"
                                    aria-label="Allow simulated network requests"
                                />
                                <span>
                                    <span className="font-medium text-kali-text">Allow network requests</span>
                                    <span className="mt-1 block text-xs text-kali-text/60">
                                        Enables outbound calls for approved demo integrations.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </section>
                )}
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
                        if (parsed.volume !== undefined) setVolume(parsed.volume);
                        if (parsed.theme !== undefined) {
                            setTheme(parsed.theme);
                        }
                        if (isKeymapRecord(parsed.keymap)) {
                            resetKeymap();
                            Object.entries(parsed.keymap).forEach(([description, keys]) => {
                                updateShortcut(description, keys);
                            });
                        }
                        reportStatus('Settings imported successfully');
                    } catch (err) {
                        console.error('Invalid settings', err);
                        reportStatus('Import failed. Please check your settings file.');
                    }
                    e.target.value = '';
                }}
                className="hidden"
                aria-label="Import settings JSON file"
            />
        </div>
    );
}

export default Settings;

export const displaySettings = () => {
    return <Settings> </Settings>;
};
