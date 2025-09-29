import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../base/Modal';

export const DEFAULT_SHORTCUTS = [
    {
        id: 'show-overlay',
        description: 'Show keyboard shortcut overlay',
        keys: ['?'],
        keywords: ['help', 'keyboard'],
    },
    {
        id: 'window-switcher',
        description: 'Switch between open apps',
        keys: ['Alt', 'Tab'],
        keywords: ['switch', 'apps', 'task switcher'],
    },
    {
        id: 'window-switcher-reverse',
        description: 'Switch between open apps (reverse order)',
        keys: ['Alt', 'Shift', 'Tab'],
        keywords: ['previous', 'window', 'reverse'],
    },
    {
        id: 'cycle-app-windows',
        description: 'Cycle windows of the focused app',
        keys: ['Alt', '`'],
        keywords: ['backtick', 'tilde', 'window'],
    },
    {
        id: 'clipboard-manager',
        description: 'Open the clipboard manager',
        keys: ['Ctrl', 'Shift', 'V'],
        keywords: ['clipboard', 'history', 'paste'],
    },
    {
        id: 'snap-left',
        description: 'Snap the focused window to the left',
        keys: ['Super', 'ArrowLeft'],
        keywords: ['tile', 'arrange', 'left', 'windows'],
    },
    {
        id: 'snap-right',
        description: 'Snap the focused window to the right',
        keys: ['Super', 'ArrowRight'],
        keywords: ['tile', 'arrange', 'right', 'windows'],
    },
    {
        id: 'maximize-window',
        description: 'Maximize the focused window',
        keys: ['Super', 'ArrowUp'],
        keywords: ['tile', 'arrange', 'top', 'maximize'],
    },
    {
        id: 'minimize-window',
        description: 'Minimize or restore the focused window',
        keys: ['Super', 'ArrowDown'],
        keywords: ['tile', 'arrange', 'bottom', 'minimize'],
    },
    {
        id: 'keyboard-context-menu',
        description: 'Open the desktop context menu',
        keys: ['Shift', 'F10'],
        keywords: ['menu', 'context', 'accessibility'],
    },
];

const KEY_LABELS = {
    default: {
        Alt: 'Alt',
        Shift: 'Shift',
        Ctrl: 'Ctrl',
        Super: 'Super',
        Meta: 'Super',
        Tab: 'Tab',
        F10: 'F10',
        ArrowLeft: '←',
        ArrowRight: '→',
        ArrowUp: '↑',
        ArrowDown: '↓',
    },
    mac: {
        Alt: '⌥',
        Shift: '⇧',
        Ctrl: '⌃',
        Super: '⌘',
        Meta: '⌘',
        Tab: '⇥',
        F10: 'F10',
        ArrowLeft: '←',
        ArrowRight: '→',
        ArrowUp: '↑',
        ArrowDown: '↓',
    },
};

const KEYWORD_ALIASES = {
    default: {
        Super: ['super', 'windows', 'win', 'meta'],
        Ctrl: ['ctrl', 'control'],
        Alt: ['alt', 'option'],
    },
    mac: {
        Super: ['super', 'command', 'cmd', '⌘'],
        Ctrl: ['control', 'ctrl', '⌃'],
        Alt: ['option', '⌥', 'alt'],
    },
};

const detectPlatform = () => {
    if (typeof navigator === 'undefined') return 'default';
    const platform = navigator.platform?.toLowerCase?.() || '';
    const userAgent = navigator.userAgent?.toLowerCase?.() || '';
    if (platform.includes('mac') || userAgent.includes('mac os')) {
        return 'mac';
    }
    return 'default';
};

const formatKey = (key, platform) => {
    const labels = KEY_LABELS[platform] || KEY_LABELS.default;
    if (labels[key]) return labels[key];
    if (key.length === 1) return key.toUpperCase();
    if (key.startsWith('Arrow')) {
        const arrows = labels[key];
        if (arrows) return arrows;
    }
    return key;
};

const formatShortcut = (keys, platform) =>
    keys
        .map((key) => formatKey(key, platform))
        .join(platform === 'mac' ? '' : ' + ')
        .replace(/([⌘⌥⌃⇧])(?=[^\s+])/g, '$1');

const getSearchableText = (shortcut, platform) => {
    const labels = KEY_LABELS[platform] || KEY_LABELS.default;
    const aliasMap = KEYWORD_ALIASES[platform] || KEYWORD_ALIASES.default;
    const keyText = shortcut.keys
        .map((key) => {
            const base = labels[key] || key;
            const aliases = aliasMap[key] || [];
            return [base, key, ...aliases].join(' ');
        })
        .join(' ');
    const keywordText = (shortcut.keywords || []).join(' ');
    return `${shortcut.description} ${keyText} ${keywordText}`.toLowerCase();
};

const ShortcutSelector = ({ onClose, shortcuts = DEFAULT_SHORTCUTS }) => {
    const [query, setQuery] = useState('');
    const [platform, setPlatform] = useState('default');
    const [copiedId, setCopiedId] = useState(null);
    const [feedback, setFeedback] = useState('');
    const searchRef = useRef(null);

    useEffect(() => {
        setPlatform(detectPlatform());
    }, []);

    useEffect(() => {
        if (searchRef.current) {
            searchRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (!copiedId) return;
        const timer = setTimeout(() => {
            setCopiedId(null);
        }, 2000);
        return () => clearTimeout(timer);
    }, [copiedId]);

    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(() => {
            setFeedback('');
        }, 2500);
        return () => clearTimeout(timer);
    }, [feedback]);

    const normalizedQuery = query.trim().toLowerCase();

    const filteredShortcuts = useMemo(() => {
        if (!normalizedQuery) return shortcuts;
        return shortcuts.filter((shortcut) =>
            getSearchableText(shortcut, platform).includes(normalizedQuery)
        );
    }, [normalizedQuery, platform, shortcuts]);

    const handleCopy = useCallback(
        async (shortcut) => {
            const text = formatShortcut(shortcut.keys, platform);
            try {
                if (
                    typeof navigator !== 'undefined' &&
                    navigator.clipboard &&
                    typeof navigator.clipboard.writeText === 'function'
                ) {
                    await navigator.clipboard.writeText(text);
                    setCopiedId(shortcut.id);
                    setFeedback(`Copied ${text} to clipboard.`);
                } else {
                    throw new Error('Clipboard API unavailable');
                }
            } catch (error) {
                setFeedback(
                    'Copy is not supported in this browser. Select the shortcut text and use your copy keys.'
                );
            }
        },
        [platform]
    );

    const handleSearchChange = (event) => {
        setQuery(event.target.value);
    };

    return (
        <Modal isOpen onClose={onClose}>
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-10">
                <div
                    className="absolute inset-0 bg-black bg-opacity-70"
                    aria-hidden="true"
                    onClick={onClose}
                />
                <div
                    className="relative z-10 w-full max-w-3xl overflow-hidden rounded-lg bg-ub-grey text-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex flex-col gap-4 px-6 py-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">Keyboard shortcuts</h2>
                                <p className="text-sm text-white/70">
                                    Open this selector from the desktop context menu (right-click or press Shift+F10),
                                    then choose “Create Shortcut…”. Press Esc to close this window.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="self-start rounded bg-white/15 px-3 py-1 text-sm font-medium text-white transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                            >
                                Close
                            </button>
                        </div>
                        <div>
                            <label htmlFor="shortcut-search" className="sr-only">
                                Search shortcuts
                            </label>
                            <input
                                ref={searchRef}
                                id="shortcut-search"
                                type="search"
                                value={query}
                                onChange={handleSearchChange}
                                placeholder="Search by action or key"
                                className="w-full rounded border border-white/20 bg-black/30 px-4 py-2 text-sm text-white placeholder-white/50 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                        </div>
                        <div role="status" aria-live="polite" className="sr-only">
                            {feedback}
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto rounded-md border border-white/10 bg-black/20">
                            {filteredShortcuts.length > 0 ? (
                                <ul className="divide-y divide-white/10">
                                    {filteredShortcuts.map((shortcut) => {
                                        const display = formatShortcut(shortcut.keys, platform);
                                        const isCopied = copiedId === shortcut.id;
                                        return (
                                            <li
                                                key={shortcut.id}
                                                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium">{shortcut.description}</p>
                                                    <p className="mt-1 font-mono text-sm text-white/80">
                                                        {display}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isCopied ? (
                                                        <span className="text-xs uppercase tracking-wide text-emerald-300" role="status">
                                                            Copied
                                                        </span>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(shortcut)}
                                                        className="rounded border border-white/30 px-3 py-1 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                                                    >
                                                        Copy
                                                        <span className="sr-only"> {shortcut.description}</span>
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="px-4 py-10 text-center text-sm text-white/70">
                                    No shortcuts match “{query}”. Try a different search term.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ShortcutSelector;
