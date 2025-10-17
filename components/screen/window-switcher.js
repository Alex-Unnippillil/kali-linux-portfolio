import React, { useEffect, useMemo, useRef, useState } from 'react';

const CARD_PREVIEW_HEIGHT = 180;

const clampIndex = (value, length) => {
    if (length <= 0) return 0;
    const modulo = ((value % length) + length) % length;
    return modulo;
};

export default function WindowSwitcher({ windows = [], onSelect, onClose, containerRef }) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const [showSearch, setShowSearch] = useState(false);
    const internalRef = useRef(null);
    const inputRef = useRef(null);
    const resolvedContainerRef = containerRef ?? internalRef;

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) {
            return windows;
        }
        return windows.filter((window) =>
            (window.title || window.id || '')
                .toString()
                .toLowerCase()
                .includes(term),
        );
    }, [query, windows]);

    useEffect(() => {
        setSelected((current) => {
            if (!filtered.length) return 0;
            return Math.min(current, filtered.length - 1);
        });
    }, [filtered]);

    useEffect(() => {
        setSelected(0);
    }, [windows]);

    useEffect(() => {
        if (!resolvedContainerRef.current) return;
        resolvedContainerRef.current.focus();
    }, [resolvedContainerRef]);

    useEffect(() => {
        if (showSearch) {
            inputRef.current?.focus();
        }
    }, [showSearch]);

    useEffect(() => {
        const handleKeyUp = (event) => {
            if (event.key === 'Alt') {
                const win = filtered[selected];
                if (win && typeof onSelect === 'function') {
                    onSelect(win.id);
                } else if (typeof onClose === 'function') {
                    onClose();
                }
            }
        };

        window.addEventListener('keyup', handleKeyUp);
        return () => window.removeEventListener('keyup', handleKeyUp);
    }, [filtered, selected, onSelect, onClose]);

    const triggerSelect = (index) => {
        const win = filtered[index];
        if (!win || typeof onSelect !== 'function') return;
        onSelect(win.id);
    };

    const handleNavigation = (event) => {
        const { key, shiftKey } = event;
        const length = filtered.length;
        if (!length) return;

        if (key === 'Tab') {
            event.preventDefault();
            const direction = shiftKey ? -1 : 1;
            setSelected((current) => clampIndex(current + direction, length));
        } else if (key === 'ArrowRight' || key === 'ArrowDown') {
            event.preventDefault();
            setSelected((current) => clampIndex(current + 1, length));
        } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
            event.preventDefault();
            setSelected((current) => clampIndex(current - 1, length));
        } else if (key === 'Home') {
            event.preventDefault();
            setSelected(0);
        } else if (key === 'End') {
            event.preventDefault();
            setSelected(length - 1);
        } else if (key === 'Enter') {
            event.preventDefault();
            triggerSelect(selected);
        }
    };

    const openSearch = (initialQuery = '') => {
        setShowSearch(true);
        setQuery(initialQuery);
        setSelected(0);
    };

    const handleEscape = () => {
        if (showSearch) {
            if (query) {
                setQuery('');
            } else {
                hideSearch();
            }
        } else if (typeof onClose === 'function') {
            onClose();
        }
    };

    const handleContainerKeyDown = (event) => {
        if (showSearch && event.target === inputRef.current) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            handleEscape();
            return;
        }

        if (!showSearch) {
            const isCharacterKey =
                event.key.length === 1 &&
                !event.altKey &&
                !event.ctrlKey &&
                !event.metaKey;

            if (event.key === '/' || (event.key === 'f' && (event.ctrlKey || event.metaKey))) {
                event.preventDefault();
                openSearch('');
                return;
            }

            if (isCharacterKey) {
                event.preventDefault();
                openSearch(event.key);
                return;
            }
        }

        handleNavigation(event);
    };

    const handleInputKeyDown = (event) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End', 'Enter'].includes(event.key)) {
            handleNavigation(event);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            handleEscape();
        }
    };

    const handleCardClick = (index) => {
        setSelected(index);
        triggerSelect(index);
    };

    const handleQueryChange = (event) => {
        setQuery(event.target.value);
        setSelected(0);
    };

    const hideSearch = () => {
        setShowSearch(false);
        setQuery('');
        resolvedContainerRef.current?.focus();
    };

    return (
        <div
            ref={resolvedContainerRef}
            tabIndex={-1}
            onKeyDown={handleContainerKeyDown}
            className="flex h-full w-full flex-col focus:outline-none text-white"
            role="presentation"
        >
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-ub-grey/80 p-6 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold tracking-wide">Switch windows</h2>
                    <div className="flex items-center gap-2 text-sm">
                        {showSearch ? (
                            <button
                                type="button"
                                onClick={hideSearch}
                                className="rounded-md px-2 py-1 bg-white/10 hover:bg-white/20 transition"
                            >
                                Hide search
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => openSearch('')}
                                className="rounded-md px-2 py-1 bg-white/10 hover:bg-white/20 transition"
                            >
                                Search
                            </button>
                        )}
                    </div>
                </div>
                {showSearch && (
                    <div>
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={handleQueryChange}
                            onKeyDown={handleInputKeyDown}
                            placeholder="Filter windows"
                            aria-label="Filter windows"
                            className="w-full rounded-md bg-black/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ub-orange"
                        />
                    </div>
                )}
                <div
                    className="flex gap-4 overflow-x-auto pb-2"
                    role="listbox"
                    aria-label="Open windows"
                    aria-activedescendant={filtered[selected]?.id ? `window-switcher-${filtered[selected].id}` : undefined}
                >
                    {filtered.map((window, index) => {
                        const isSelected = index === selected;
                        return (
                            <button
                                key={window.id}
                                id={`window-switcher-${window.id}`}
                                type="button"
                                className={`flex-shrink-0 w-[280px] rounded-xl border-2 transition focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                                    isSelected
                                        ? 'border-ub-orange bg-white/10 shadow-xl'
                                        : 'border-transparent bg-white/5 hover:bg-white/10'
                                }`}
                                onClick={() => handleCardClick(index)}
                                onMouseEnter={() => setSelected(index)}
                                role="option"
                                aria-selected={isSelected}
                                aria-label={window.title || window.id}
                            >
                                <div className="flex h-full flex-col text-left">
                                    <div className="relative overflow-hidden rounded-t-xl bg-black/70" style={{ height: CARD_PREVIEW_HEIGHT }}>
                                        {window.preview ? (
                                            <img
                                                src={window.preview}
                                                alt={`${window.title} preview`}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                                                {window.icon ? (
                                                    <img src={window.icon} alt="" className="h-12 w-12" />
                                                ) : (
                                                    <span className="text-xs text-white/60">No preview</span>
                                                )}
                                            </div>
                                        )}
                                        {window.icon && (
                                            <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-xl bg-black/70 shadow-lg">
                                                <img src={window.icon} alt="" className="h-8 w-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="truncate px-4 py-3 text-sm font-medium">
                                        {window.title || window.id}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    {!filtered.length && (
                        <div className="w-full text-center text-sm text-white/70">No windows match your search.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

