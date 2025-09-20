import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import {
    resetSettings,
    defaults,
    exportSettings as exportSettingsData,
    importSettings as importSettingsData,
    getWindowRules,
    setWindowRules,
} from '../../utils/settingsStore';
import { validateRegex, validateCondition } from '../../utils/validation';
import Tester from './settings/window-rules/Tester';

const generateRuleId = () => {
    const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
        try {
            return globalCrypto.randomUUID();
        } catch (error) {
            // Fallback to Math.random below
        }
    }
    return `rule-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeRule = (rule = {}) => ({
    id: rule.id || generateRuleId(),
    name: typeof rule.name === 'string' ? rule.name : '',
    appIdPattern: typeof rule.appIdPattern === 'string' ? rule.appIdPattern : '',
    titlePattern: typeof rule.titlePattern === 'string' ? rule.titlePattern : '',
    condition: typeof rule.condition === 'string' ? rule.condition : '',
    width:
        typeof rule.width === 'number' && !Number.isNaN(rule.width)
            ? rule.width
            : null,
    height:
        typeof rule.height === 'number' && !Number.isNaN(rule.height)
            ? rule.height
            : null,
    enabled: rule.enabled === false ? false : true,
});

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, density, setDensity, reducedMotion, setReducedMotion, largeHitAreas, setLargeHitAreas, fontScale, setFontScale, highContrast, setHighContrast, pongSpin, setPongSpin, allowNetwork, setAllowNetwork, haptics, setHaptics, theme, setTheme } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);
    const fileInput = useRef(null);
    const [windowRules, setWindowRulesState] = useState([]);
    const [draftRules, setDraftRules] = useState([]);
    const [savingRules, setSavingRules] = useState(false);
    const [loadingRules, setLoadingRules] = useState(true);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

    const changeBackgroundImage = (e) => {
        const name = e.currentTarget.dataset.path;
        setWallpaper(name);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const stored = await getWindowRules();
                if (cancelled) return;
                const normalized = (stored || []).map((rule) => normalizeRule(rule));
                setWindowRulesState(normalized);
                setDraftRules(normalized.map((rule) => ({ ...rule })));
            } catch (error) {
                console.error('Failed to load window rules', error);
                if (!cancelled) {
                    setWindowRulesState([]);
                    setDraftRules([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingRules(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const ruleDiagnostics = useMemo(() => {
        const map = new Map();
        draftRules.forEach((rule) => {
            map.set(rule.id, {
                appId: validateRegex(rule.appIdPattern || '', 'i'),
                title: validateRegex(rule.titlePattern || '', 'i'),
                condition: validateCondition(rule.condition || ''),
            });
        });
        return map;
    }, [draftRules]);

    const hasValidationErrors = useMemo(
        () =>
            Array.from(ruleDiagnostics.values()).some(
                (diagnostic) =>
                    !diagnostic.appId.valid ||
                    !diagnostic.title.valid ||
                    !diagnostic.condition.valid
            ),
        [ruleDiagnostics]
    );

    const rulesDirty = useMemo(() => {
        const normalisedStored = windowRules.map((rule) => normalizeRule(rule));
        const normalisedDraft = draftRules.map((rule) => normalizeRule(rule));
        return JSON.stringify(normalisedStored) !== JSON.stringify(normalisedDraft);
    }, [windowRules, draftRules]);

    const addRule = useCallback(() => {
        setDraftRules((prev) => [
            ...prev,
            normalizeRule({ id: generateRuleId(), name: 'New rule', enabled: true }),
        ]);
    }, []);

    const updateRule = useCallback((id, updates) => {
        setDraftRules((prev) =>
            prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
        );
    }, []);

    const removeRule = useCallback((id) => {
        setDraftRules((prev) => prev.filter((rule) => rule.id !== id));
    }, []);

    const handleSaveRules = useCallback(async () => {
        setSavingRules(true);
        try {
            const sanitized = draftRules.map((rule) => {
                const normalised = normalizeRule(rule);
                if (typeof normalised.width === 'number') {
                    normalised.width = Math.min(Math.max(normalised.width, 10), 100);
                }
                if (typeof normalised.height === 'number') {
                    normalised.height = Math.min(Math.max(normalised.height, 10), 100);
                }
                return normalised;
            });
            await setWindowRules(sanitized);
            const cloned = sanitized.map((rule) => ({ ...rule }));
            setWindowRulesState(cloned);
            setDraftRules(cloned.map((rule) => ({ ...rule })));
        } catch (error) {
            console.error('Failed to save window rules', error);
        } finally {
            setSavingRules(false);
        }
    }, [draftRules]);

    const handleRevertRules = useCallback(() => {
        setDraftRules(windowRules.map((rule) => ({ ...rule })));
    }, [windowRules]);

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
            <div className="mt-6 w-full border-t border-gray-900 pt-6">
                <h2 className="text-lg font-semibold text-center text-white">Window rules</h2>
                <p className="mt-1 text-sm text-center text-ubt-grey">
                    Define window sizing rules and use the tester to preview them before you
                    commit changes.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                        {draftRules.length === 0 ? (
                            <p className="rounded border border-dashed border-gray-700 bg-black/30 p-3 text-sm text-ubt-grey">
                                {loadingRules
                                    ? 'Loading saved rules…'
                                    : 'No window rules yet. Add one to start experimenting.'}
                            </p>
                        ) : (
                            draftRules.map((rule) => {
                                const diagnostics = ruleDiagnostics.get(rule.id) || {
                                    appId: { valid: true },
                                    title: { valid: true },
                                    condition: { valid: true },
                                };
                                return (
                                    <div
                                        key={rule.id}
                                        className="space-y-3 rounded border border-gray-800 bg-black/40 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <input
                                                type="text"
                                                value={rule.name}
                                                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                                                placeholder="Rule name"
                                                className="flex-1 rounded bg-black/40 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-ub-orange"
                                            />
                                            <label className="flex items-center gap-2 text-xs text-ubt-grey">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.enabled !== false}
                                                    onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                                                />
                                                Enabled
                                            </label>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs text-ubt-grey" htmlFor={`rule-app-${rule.id}`}>
                                                App ID (regex)
                                            </label>
                                            <input
                                                id={`rule-app-${rule.id}`}
                                                type="text"
                                                value={rule.appIdPattern}
                                                onChange={(e) => updateRule(rule.id, { appIdPattern: e.target.value })}
                                                className="w-full rounded bg-black/40 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-ub-orange"
                                                placeholder="e.g. ^terminal$"
                                            />
                                            {rule.appIdPattern && !diagnostics.appId.valid && (
                                                <p className="mt-1 text-xs text-red-400">
                                                    {diagnostics.appId.error}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs text-ubt-grey" htmlFor={`rule-title-${rule.id}`}>
                                                Title (regex)
                                            </label>
                                            <input
                                                id={`rule-title-${rule.id}`}
                                                type="text"
                                                value={rule.titlePattern}
                                                onChange={(e) => updateRule(rule.id, { titlePattern: e.target.value })}
                                                className="w-full rounded bg-black/40 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-ub-orange"
                                                placeholder="Optional title pattern"
                                            />
                                            {rule.titlePattern && !diagnostics.title.valid && (
                                                <p className="mt-1 text-xs text-red-400">
                                                    {diagnostics.title.error}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs text-ubt-grey" htmlFor={`rule-condition-${rule.id}`}>
                                                Condition (optional)
                                            </label>
                                            <textarea
                                                id={`rule-condition-${rule.id}`}
                                                value={rule.condition}
                                                onChange={(e) => updateRule(rule.id, { condition: e.target.value })}
                                                rows={2}
                                                className="w-full rounded bg-black/40 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-ub-orange"
                                                placeholder="Example: appId === 'terminal' && !isMaximized"
                                            ></textarea>
                                            {rule.condition && rule.condition.trim() && !diagnostics.condition.valid && (
                                                <p className="mt-1 text-xs text-red-400">
                                                    {diagnostics.condition.error}
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="mb-1 block text-xs text-ubt-grey" htmlFor={`rule-width-${rule.id}`}>
                                                    Width (%)
                                                </label>
                                                <input
                                                    id={`rule-width-${rule.id}`}
                                                    type="number"
                                                    min="10"
                                                    max="100"
                                                    step="1"
                                                    value={rule.width ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const numeric = value === '' ? null : parseFloat(value);
                                                        updateRule(rule.id, {
                                                            width: Number.isNaN(numeric) ? null : numeric,
                                                        });
                                                    }}
                                                    className="w-full rounded bg-black/40 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-ub-orange"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs text-ubt-grey" htmlFor={`rule-height-${rule.id}`}>
                                                    Height (%)
                                                </label>
                                                <input
                                                    id={`rule-height-${rule.id}`}
                                                    type="number"
                                                    min="10"
                                                    max="100"
                                                    step="1"
                                                    value={rule.height ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const numeric = value === '' ? null : parseFloat(value);
                                                        updateRule(rule.id, {
                                                            height: Number.isNaN(numeric) ? null : numeric,
                                                        });
                                                    }}
                                                    className="w-full rounded bg-black/40 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-ub-orange"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeRule(rule.id)}
                                                className="text-xs text-red-400 underline"
                                            >
                                                Remove rule
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <button
                            type="button"
                            onClick={addRule}
                            className="w-full rounded border border-dashed border-ub-orange px-3 py-2 text-sm text-ub-orange hover:bg-ub-orange/10"
                        >
                            Add rule
                        </button>
                    </div>
                    <Tester rules={draftRules} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleRevertRules}
                        disabled={!rulesDirty || loadingRules || savingRules}
                        className={`rounded px-3 py-2 text-sm ${
                            !rulesDirty || loadingRules
                                ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                                : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                    >
                        Revert changes
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveRules}
                        disabled={!rulesDirty || hasValidationErrors || savingRules}
                        className={`rounded px-3 py-2 text-sm ${
                            !rulesDirty || hasValidationErrors || savingRules
                                ? 'cursor-not-allowed bg-ubt-grey text-gray-400'
                                : 'bg-ub-orange text-white hover:bg-orange-500'
                        }`}
                    >
                        {savingRules ? 'Saving…' : 'Save rules'}
                    </button>
                </div>
                {hasValidationErrors && (
                    <p className="mt-2 text-right text-xs text-red-400">
                        Resolve validation errors and rely on the tester before saving your
                        rules.
                    </p>
                )}
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
                        setWindowRulesState([]);
                        setDraftRules([]);
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
                        if (parsed.windowRules !== undefined) {
                            const normalisedRules = Array.isArray(parsed.windowRules)
                                ? parsed.windowRules.map((rule) => normalizeRule(rule))
                                : [];
                            setWindowRulesState(normalisedRules);
                            setDraftRules(normalisedRules.map((rule) => ({ ...rule })));
                        }
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
