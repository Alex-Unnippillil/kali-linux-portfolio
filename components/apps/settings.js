import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings, ACCENT_OPTIONS } from '../../hooks/useSettings';
import {
    resetSettings,
    defaults,
    exportSettings as exportSettingsData,
    importSettings as importSettingsData,
    getDndEnabled as loadDndEnabled,
    getDndSchedules as loadDndSchedules,
    getDndOverrides as loadDndOverrides,
    getUrgentAllowList as loadUrgentAllowList,
} from '../../utils/settingsStore';

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
        theme,
        setTheme,
        dndEnabled,
        setDndEnabled,
        dndSchedules,
        setDndSchedules,
        dndOverrides,
        setDndOverrides,
        urgentAllowList,
        setUrgentAllowList,
    } = useSettings();
    const [contrast, setContrast] = useState(0);
    const [newScheduleLabel, setNewScheduleLabel] = useState('');
    const [newScheduleStart, setNewScheduleStart] = useState('22:00');
    const [newScheduleEnd, setNewScheduleEnd] = useState('07:00');
    const [newScheduleDays, setNewScheduleDays] = useState([1, 2, 3, 4, 5]);
    const [newOverrideApp, setNewOverrideApp] = useState('');
    const [newOverrideMode, setNewOverrideMode] = useState('allow');
    const [urgentEntry, setUrgentEntry] = useState('');
    const liveRegion = useRef(null);
    const fileInput = useRef(null);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const changeBackgroundImage = (e) => {
        const name = e.currentTarget.dataset.path;
        setWallpaper(name);
    };

    const toggleNewScheduleDay = useCallback((day) => {
        setNewScheduleDays(prev => {
            const exists = prev.includes(day);
            const next = exists ? prev.filter(d => d !== day) : [...prev, day];
            return next.sort((a, b) => a - b);
        });
    }, []);

    const addSchedule = useCallback(() => {
        if (!newScheduleStart || !newScheduleEnd || newScheduleDays.length === 0) {
            return;
        }
        const label = newScheduleLabel.trim();
        const newEntry = {
            id: `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            label: label || undefined,
            start: newScheduleStart,
            end: newScheduleEnd,
            days: [...newScheduleDays].sort((a, b) => a - b),
            enabled: true,
        };
        setDndSchedules(prev => [...prev, newEntry]);
        setNewScheduleLabel('');
        setNewScheduleStart('22:00');
        setNewScheduleEnd('07:00');
        setNewScheduleDays([1, 2, 3, 4, 5]);
    }, [newScheduleLabel, newScheduleStart, newScheduleEnd, newScheduleDays, setDndSchedules]);

    const updateScheduleLabel = useCallback((id, value) => {
        setDndSchedules(prev => prev.map(schedule => schedule.id === id ? { ...schedule, label: value } : schedule));
    }, [setDndSchedules]);

    const updateScheduleTime = useCallback((id, field, value) => {
        setDndSchedules(prev => prev.map(schedule => schedule.id === id ? { ...schedule, [field]: value } : schedule));
    }, [setDndSchedules]);

    const toggleScheduleDay = useCallback((id, day) => {
        setDndSchedules(prev => prev.map(schedule => {
            if (schedule.id !== id) return schedule;
            const exists = schedule.days.includes(day);
            const nextDays = exists ? schedule.days.filter(d => d !== day) : [...schedule.days, day];
            return { ...schedule, days: nextDays.sort((a, b) => a - b) };
        }));
    }, [setDndSchedules]);

    const toggleScheduleEnabled = useCallback((id) => {
        setDndSchedules(prev => prev.map(schedule => schedule.id === id ? { ...schedule, enabled: !schedule.enabled } : schedule));
    }, [setDndSchedules]);

    const removeSchedule = useCallback((id) => {
        setDndSchedules(prev => prev.filter(schedule => schedule.id !== id));
    }, [setDndSchedules]);

    const addOverride = useCallback(() => {
        const trimmed = newOverrideApp.trim();
        if (!trimmed) return;
        setDndOverrides(prev => ({ ...prev, [trimmed]: newOverrideMode }));
        setNewOverrideApp('');
        setNewOverrideMode('allow');
    }, [newOverrideApp, newOverrideMode, setDndOverrides]);

    const updateOverride = useCallback((appId, mode) => {
        setDndOverrides(prev => ({ ...prev, [appId]: mode }));
    }, [setDndOverrides]);

    const removeOverride = useCallback((appId) => {
        setDndOverrides(prev => {
            const next = { ...prev };
            delete next[appId];
            return next;
        });
    }, [setDndOverrides]);

    const addUrgentEntry = useCallback(() => {
        const trimmed = urgentEntry.trim();
        if (!trimmed || urgentAllowList.includes(trimmed)) return;
        setUrgentAllowList(prev => [...prev, trimmed]);
        setUrgentEntry('');
    }, [urgentEntry, urgentAllowList, setUrgentAllowList]);

    const removeUrgentEntry = useCallback((entry) => {
        setUrgentAllowList(prev => prev.filter(item => item !== entry));
    }, [setUrgentAllowList]);

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
            <div className="mx-auto my-6 w-11/12 max-w-4xl bg-ub-dark-400 border border-gray-900 rounded p-4 text-ubt-grey">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Do Not Disturb</h2>
                        <p className="text-xs text-ubt-grey">Define quiet hours and control which alerts break through.</p>
                    </div>
                    <label className="flex items-center text-sm text-ubt-grey">
                        <input
                            type="checkbox"
                            checked={dndEnabled}
                            onChange={(e) => setDndEnabled(e.target.checked)}
                            className="mr-2"
                        />
                        Enabled
                    </label>
                </div>
                <div className="mt-4 space-y-4">
                    {dndSchedules.length === 0 ? (
                        <p className="text-sm text-ubt-grey">No schedules yet. Add one below to silence notifications during quiet hours.</p>
                    ) : (
                        dndSchedules.map((schedule) => (
                            <div key={schedule.id} className="border border-ubt-cool-grey rounded p-3 bg-ub-cool-grey bg-opacity-20">
                                <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs uppercase tracking-wide mb-1 text-ubt-grey">Label</label>
                                        <input
                                            type="text"
                                            value={schedule.label || ''}
                                            onChange={(e) => updateScheduleLabel(schedule.id, e.target.value)}
                                            className="w-full bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                                            placeholder="Weeknights, Weekend..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide mb-1 text-ubt-grey">Start</label>
                                        <input
                                            type="time"
                                            value={schedule.start}
                                            onChange={(e) => updateScheduleTime(schedule.id, 'start', e.target.value)}
                                            className="bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide mb-1 text-ubt-grey">End</label>
                                        <input
                                            type="time"
                                            value={schedule.end}
                                            onChange={(e) => updateScheduleTime(schedule.id, 'end', e.target.value)}
                                            className="bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                                        />
                                    </div>
                                    <label className="flex items-center text-sm text-ubt-grey whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={schedule.enabled}
                                            onChange={() => toggleScheduleEnabled(schedule.id)}
                                            className="mr-2"
                                            disabled={!dndEnabled}
                                        />
                                        Active
                                    </label>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {dayLabels.map((label, index) => {
                                        const selected = schedule.days.includes(index);
                                        return (
                                            <button
                                                key={`${schedule.id}-${label}`}
                                                type="button"
                                                onClick={() => toggleScheduleDay(schedule.id, index)}
                                                className={`px-2 py-1 rounded border text-xs ${selected ? 'bg-ub-orange text-white border-ub-orange' : 'bg-ub-cool-grey text-ubt-grey border-ubt-cool-grey'}`}
                                                aria-pressed={selected}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => removeSchedule(schedule.id)}
                                        className="text-xs text-red-300 hover:text-red-200"
                                    >
                                        Remove schedule
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-4 border-t border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold text-white">Add quiet hours</h3>
                    <div className="grid gap-2 md:grid-cols-4 sm:grid-cols-2 grid-cols-1 mt-2">
                        <label className="flex flex-col text-xs text-ubt-grey">
                            Name
                            <input
                                type="text"
                                value={newScheduleLabel}
                                onChange={(e) => setNewScheduleLabel(e.target.value)}
                                className="mt-1 bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                                placeholder="Weeknights"
                            />
                        </label>
                        <label className="flex flex-col text-xs text-ubt-grey">
                            Start
                            <input
                                type="time"
                                value={newScheduleStart}
                                onChange={(e) => setNewScheduleStart(e.target.value)}
                                className="mt-1 bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                            />
                        </label>
                        <label className="flex flex-col text-xs text-ubt-grey">
                            End
                            <input
                                type="time"
                                value={newScheduleEnd}
                                onChange={(e) => setNewScheduleEnd(e.target.value)}
                                className="mt-1 bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                            />
                        </label>
                        <div className="flex flex-col text-xs text-ubt-grey">
                            Days
                            <div className="mt-1 flex flex-wrap gap-2">
                                {dayLabels.map((label, index) => {
                                    const selected = newScheduleDays.includes(index);
                                    return (
                                        <button
                                            key={`new-${label}`}
                                            type="button"
                                            onClick={() => toggleNewScheduleDay(index)}
                                            className={`px-2 py-1 rounded border ${selected ? 'bg-ub-orange text-white border-ub-orange' : 'bg-ub-cool-grey text-ubt-grey border-ubt-cool-grey'}`}
                                            aria-pressed={selected}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={addSchedule}
                        className="mt-3 px-3 py-1 rounded bg-ub-orange text-white text-sm"
                    >
                        Add Schedule
                    </button>
                </div>
                <div className="mt-6 border-t border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold text-white">App overrides</h3>
                    <p className="text-xs text-ubt-grey mb-2">Choose apps that bypass or always follow quiet hours.</p>
                    {Object.keys(dndOverrides).length === 0 ? (
                        <p className="text-xs text-ubt-grey">No overrides configured.</p>
                    ) : (
                        <ul className="space-y-2">
                            {Object.entries(dndOverrides).map(([appId, mode]) => (
                                <li key={appId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-ubt-cool-grey rounded px-3 py-2">
                                    <span className="font-mono text-sm text-white break-all">{appId}</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={mode}
                                            onChange={(e) => updateOverride(appId, e.target.value)}
                                            className="bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey text-sm"
                                        >
                                            <option value="allow">Bypass DND</option>
                                            <option value="block">Always mute</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removeOverride(appId)}
                                            className="text-xs text-red-300 hover:text-red-200"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_auto] grid-cols-1">
                        <input
                            type="text"
                            value={newOverrideApp}
                            onChange={(e) => setNewOverrideApp(e.target.value)}
                            placeholder="App id (e.g. mail)"
                            className="bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                        />
                        <select
                            value={newOverrideMode}
                            onChange={(e) => setNewOverrideMode(e.target.value)}
                            className="bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey text-sm"
                        >
                            <option value="allow">Bypass DND</option>
                            <option value="block">Always mute</option>
                        </select>
                        <button
                            type="button"
                            onClick={addOverride}
                            className="px-3 py-1 rounded bg-ub-orange text-white text-sm"
                        >
                            Add override
                        </button>
                    </div>
                </div>
                <div className="mt-6 border-t border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold text-white">Urgent allow list</h3>
                    <p className="text-xs text-ubt-grey mb-2">Urgent alerts from these senders can bypass quiet hours.</p>
                    {urgentAllowList.length === 0 ? (
                        <p className="text-xs text-ubt-grey">No urgent senders configured.</p>
                    ) : (
                        <ul className="flex flex-wrap gap-2">
                            {urgentAllowList.map((entry) => (
                                <li key={entry} className="flex items-center bg-ub-cool-grey text-white px-2 py-1 rounded text-xs gap-2 border border-ubt-cool-grey">
                                    <span>{entry}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeUrgentEntry(entry)}
                                        className="text-red-300 hover:text-red-200"
                                        aria-label={`Remove ${entry} from urgent allow list`}
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={urgentEntry}
                            onChange={(e) => setUrgentEntry(e.target.value)}
                            placeholder="Contact or source id"
                            className="flex-1 bg-ub-cool-grey text-white px-2 py-1 rounded border border-ubt-cool-grey"
                        />
                        <button
                            type="button"
                            onClick={addUrgentEntry}
                            className="px-3 py-1 rounded bg-ub-orange text-white text-sm self-start sm:self-auto"
                        >
                            Add sender
                        </button>
                    </div>
                </div>
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
                        setDndEnabled(defaults.dndEnabled);
                        setDndSchedules((defaults.dndSchedules || []).map(schedule => ({ ...schedule, days: [...(schedule.days || [])] })));
                        setDndOverrides({ ...(defaults.dndOverrides || {}) });
                        setUrgentAllowList([...(defaults.urgentAllowList || [])]);
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
                        if (parsed.theme !== undefined) { setTheme(parsed.theme); }
                    } catch (err) {
                        console.error('Invalid settings', err);
                    }
                    const [loadedEnabled, loadedSchedules, loadedOverrides, loadedUrgent] = await Promise.all([
                        loadDndEnabled(),
                        loadDndSchedules(),
                        loadDndOverrides(),
                        loadUrgentAllowList(),
                    ]);
                    setDndEnabled(loadedEnabled);
                    setDndSchedules(loadedSchedules);
                    setDndOverrides(loadedOverrides);
                    setUrgentAllowList(loadedUrgent);
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
