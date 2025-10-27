import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const CARD_PREVIEW_HEIGHT = 180;
const SWIPE_ACTIVATION_THRESHOLD = 12;
const SWIPE_DISMISS_THRESHOLD = 96;
const SWIPE_MIN = -360;
const SWIPE_MAX = 160;

const clampIndex = (value, length) => {
    if (length <= 0) return 0;
    const modulo = ((value % length) + length) % length;
    return modulo;
};

export default function WindowSwitcher({ windows = [], onSelect, onClose, onDismissWindow, containerRef }) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const [showSearch, setShowSearch] = useState(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [gestureEntries, setGestureEntries] = useState({});
    const internalRef = useRef(null);
    const inputRef = useRef(null);
    const gestureStateRef = useRef({});
    const gestureCleanupTimersRef = useRef({});
    const suppressedClickRef = useRef(new Set());
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
        if (typeof window === 'undefined') return undefined;

        let pointerQuery = null;
        let widthQuery = null;
        if (typeof window.matchMedia === 'function') {
            try {
                pointerQuery = window.matchMedia('(pointer: coarse)');
            } catch (error) {
                pointerQuery = null;
            }
            try {
                widthQuery = window.matchMedia('(max-width: 900px)');
            } catch (error) {
                widthQuery = null;
            }
        }

        const updateLayout = () => {
            const pointerMatch = Boolean(pointerQuery?.matches);
            const widthMatch = widthQuery ? Boolean(widthQuery.matches) : window.innerWidth <= 900;
            setIsMobileLayout(pointerMatch || widthMatch);
        };

        updateLayout();

        const listeners = [];
        const attach = (query) => {
            if (!query) return;
            const handler = () => updateLayout();
            if (typeof query.addEventListener === 'function') {
                query.addEventListener('change', handler);
                listeners.push(() => query.removeEventListener('change', handler));
            } else if (typeof query.addListener === 'function') {
                query.addListener(handler);
                listeners.push(() => query.removeListener(handler));
            }
        };

        attach(pointerQuery);
        attach(widthQuery);

        const handleResize = () => updateLayout();
        window.addEventListener('resize', handleResize);
        listeners.push(() => window.removeEventListener('resize', handleResize));

        return () => {
            listeners.forEach((cleanup) => {
                try {
                    cleanup();
                } catch (error) {
                    // ignore cleanup errors
                }
            });
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        return () => {
            const timers = gestureCleanupTimersRef.current || {};
            Object.values(timers).forEach((timer) => {
                window.clearTimeout(timer);
            });
            gestureCleanupTimersRef.current = {};
        };
    }, []);

    useEffect(() => {
        const allowedIds = new Set(windows.map((win) => win.id));
        setGestureEntries((prev) => {
            const next = {};
            let changed = false;
            Object.entries(prev).forEach(([id, entry]) => {
                if (allowedIds.has(id)) {
                    next[id] = entry;
                } else {
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        const state = gestureStateRef.current || {};
        Object.keys(state).forEach((id) => {
            if (!allowedIds.has(id)) {
                delete state[id];
            }
        });

        const suppressed = suppressedClickRef.current;
        if (suppressed && suppressed.size) {
            Array.from(suppressed).forEach((id) => {
                if (!allowedIds.has(id)) {
                    suppressed.delete(id);
                }
            });
        }
    }, [windows]);

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
        const { key, shiftKey, ctrlKey, metaKey } = event;
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
        } else if (key === 'Escape') {
            event.preventDefault();
            if (typeof onClose === 'function') {
                onClose();
            }
        } else if (
            (!showSearch && key === '/') ||
            (key === 'f' && (ctrlKey || metaKey))
        ) {
            event.preventDefault();
            setShowSearch(true);
        }
    };

    const handleContainerKeyDown = (event) => {
        if (showSearch && event.target === inputRef.current) {
            return;
        }
        handleNavigation(event);
    };

    const handleInputKeyDown = (event) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End', 'Enter'].includes(event.key)) {
            handleNavigation(event);
            return;
        }

        if (event.key === 'Escape') {
            if (query) {
                event.preventDefault();
                setQuery('');
            } else if (typeof onClose === 'function') {
                event.preventDefault();
                onClose();
            }
        }
    };

    const handleCardClick = (index) => {
        const win = filtered[index];
        if (!win) return;
        if (suppressedClickRef.current.has(win.id)) {
            suppressedClickRef.current.delete(win.id);
            return;
        }
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

    const updateGestureEntry = useCallback((id, partial) => {
        setGestureEntries((prev) => {
            const current = prev[id] || { offset: 0, active: false, dismissing: false };
            const next = { ...current, ...partial };
            return { ...prev, [id]: next };
        });
    }, []);

    const clearGestureCleanup = useCallback((id) => {
        if (typeof window === 'undefined') return;
        const timers = gestureCleanupTimersRef.current || {};
        if (timers[id]) {
            window.clearTimeout(timers[id]);
            delete timers[id];
        }
    }, []);

    const scheduleGestureCleanup = useCallback((id) => {
        if (typeof window === 'undefined') return;
        const timers = gestureCleanupTimersRef.current || {};
        if (timers[id]) {
            window.clearTimeout(timers[id]);
        }
        timers[id] = window.setTimeout(() => {
            setGestureEntries((prev) => {
                if (!prev[id]) return prev;
                const next = { ...prev };
                delete next[id];
                return next;
            });
            delete timers[id];
        }, 220);
        gestureCleanupTimersRef.current = timers;
    }, []);

    const clampSwipeOffset = (value) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return 0;
        if (value < SWIPE_MIN) return SWIPE_MIN;
        if (value > SWIPE_MAX) return SWIPE_MAX;
        return value;
    };

    const finishGesture = useCallback(
        (id, state, event, cancelled = false) => {
            if (!state) return;
            if (event?.currentTarget && typeof event.currentTarget.releasePointerCapture === 'function') {
                try {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                } catch (error) {
                    // ignore release errors
                }
            }

            const offset = clampSwipeOffset(state.offset ?? 0);
            const wasActive = Boolean(state.active);
            const shouldDismiss = !cancelled && wasActive && offset <= -SWIPE_DISMISS_THRESHOLD;

            if (shouldDismiss) {
                updateGestureEntry(id, { offset: SWIPE_MIN, active: false, dismissing: true });
                if (typeof onDismissWindow === 'function') {
                    onDismissWindow(id);
                }
            } else {
                updateGestureEntry(id, { offset: 0, active: false, dismissing: false });
                scheduleGestureCleanup(id);
            }

            if (wasActive) {
                suppressedClickRef.current.add(id);
            } else {
                suppressedClickRef.current.delete(id);
            }

            delete gestureStateRef.current[id];
        },
        [onDismissWindow, scheduleGestureCleanup, updateGestureEntry],
    );

    const createPointerHandlers = useCallback(
        (id) => {
            if (!isMobileLayout) {
                return {};
            }

            const handlePointerDown = (event) => {
                if (!isMobileLayout) return;
                const pointerType = event.pointerType || 'mouse';
                if (pointerType !== 'touch' && pointerType !== 'pen') {
                    return;
                }
                clearGestureCleanup(id);
                if (event.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
                    try {
                        event.currentTarget.setPointerCapture(event.pointerId);
                    } catch (error) {
                        // ignore capture errors
                    }
                }
                gestureStateRef.current[id] = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    active: false,
                    offset: 0,
                };
                updateGestureEntry(id, { offset: 0, active: false, dismissing: false });
            };

            const handlePointerMove = (event) => {
                if (!isMobileLayout) return;
                const pointerType = event.pointerType || 'mouse';
                if (pointerType !== 'touch' && pointerType !== 'pen') {
                    return;
                }
                const state = gestureStateRef.current[id];
                if (!state || state.pointerId !== event.pointerId) {
                    return;
                }
                const deltaX = event.clientX - state.startX;
                const deltaY = event.clientY - state.startY;
                if (!state.active) {
                    if (Math.abs(deltaY) < SWIPE_ACTIVATION_THRESHOLD || Math.abs(deltaY) < Math.abs(deltaX)) {
                        return;
                    }
                    state.active = true;
                    suppressedClickRef.current.add(id);
                }
                const offset = clampSwipeOffset(deltaY);
                state.offset = offset;
                updateGestureEntry(id, { offset, active: true, dismissing: false });
                if (typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
            };

            const handlePointerUp = (event) => {
                if (!isMobileLayout) return;
                const state = gestureStateRef.current[id];
                if (!state || state.pointerId !== event.pointerId) {
                    return;
                }
                finishGesture(id, state, event, false);
            };

            const handlePointerCancel = (event) => {
                if (!isMobileLayout) return;
                const state = gestureStateRef.current[id];
                if (!state || state.pointerId !== event.pointerId) {
                    return;
                }
                finishGesture(id, state, event, true);
            };

            return {
                onPointerDown: handlePointerDown,
                onPointerMove: handlePointerMove,
                onPointerUp: handlePointerUp,
                onPointerCancel: handlePointerCancel,
            };
        },
        [clearGestureCleanup, finishGesture, isMobileLayout, updateGestureEntry],
    );

    const panelClasses = [
        'mx-auto flex w-full flex-col gap-4 rounded-xl border border-white/10 bg-ub-grey/80 shadow-2xl',
        isMobileLayout ? 'max-w-md p-4 sm:max-w-xl sm:p-5 lg:max-w-2xl' : 'max-w-6xl p-6',
    ].join(' ');

    const listClasses = isMobileLayout
        ? 'flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1'
        : 'flex gap-4 overflow-x-auto pb-2';

    return (
        <div
            ref={resolvedContainerRef}
            tabIndex={-1}
            onKeyDown={handleContainerKeyDown}
            className="flex h-full w-full flex-col focus:outline-none text-white"
            role="presentation"
            data-mobile-layout={isMobileLayout ? 'true' : 'false'}
        >
            <div className={panelClasses}>
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold tracking-wide">Switch windows</h2>
                    <div className="flex items-center gap-2 text-sm">
                        {showSearch ? (
                            <button
                                type="button"
                                onClick={hideSearch}
                                className="rounded-md bg-white/10 px-2 py-1 transition hover:bg-white/20"
                            >
                                Hide search
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowSearch(true)}
                                className="rounded-md bg-white/10 px-2 py-1 transition hover:bg-white/20"
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
                    className={listClasses}
                    role="listbox"
                    aria-label="Open windows"
                    aria-activedescendant={filtered[selected]?.id ? `window-switcher-${filtered[selected].id}` : undefined}
                >
                    {filtered.map((window, index) => {
                        const isSelected = index === selected;
                        const gesture = gestureEntries[window.id] || { offset: 0, active: false, dismissing: false };
                        const offset = gesture?.offset ?? 0;
                        const active = Boolean(gesture?.active);
                        const dismissing = Boolean(gesture?.dismissing);
                        const pointerHandlers = isMobileLayout ? createPointerHandlers(window.id) : {};
                        const itemStyle = isMobileLayout
                            ? {
                                  transform: `translateY(${offset}px)`,
                                  opacity: dismissing ? 0 : 1,
                                  transition: active ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
                                  touchAction: 'pan-y',
                              }
                            : undefined;
                        const buttonClass = isMobileLayout
                            ? [
                                  'relative flex w-full flex-col overflow-hidden rounded-3xl border transition focus:outline-none focus:ring-2 focus:ring-ub-orange backdrop-blur-md',
                                  isSelected ? 'border-ub-orange bg-white/20 shadow-2xl' : 'border-white/10 bg-white/10 shadow-lg hover:bg-white/20',
                              ].join(' ')
                            : [
                                  'flex-shrink-0 w-[280px] rounded-xl border-2 transition focus:outline-none focus:ring-2 focus:ring-ub-orange',
                                  isSelected ? 'border-ub-orange bg-white/10 shadow-xl' : 'border-transparent bg-white/5 hover:bg-white/10',
                              ].join(' ');
                        const titleClass = isMobileLayout
                            ? 'truncate px-5 py-4 text-base font-semibold'
                            : 'truncate px-4 py-3 text-sm font-medium';
                        return (
                            <button
                                key={window.id}
                                id={`window-switcher-${window.id}`}
                                type="button"
                                className={buttonClass}
                                onClick={() => handleCardClick(index)}
                                onMouseEnter={!isMobileLayout ? () => setSelected(index) : undefined}
                                role="option"
                                aria-selected={isSelected}
                                aria-label={window.title || window.id}
                                style={itemStyle}
                                {...pointerHandlers}
                            >
                                <div className="flex h-full flex-col text-left">
                                    <div
                                        className={`relative overflow-hidden bg-black/70 ${isMobileLayout ? '' : 'rounded-t-xl'}`}
                                        style={{ height: CARD_PREVIEW_HEIGHT }}
                                    >
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
                                    <div className={titleClass}>{window.title || window.id}</div>
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

