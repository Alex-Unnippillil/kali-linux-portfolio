import React, { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';

type WindowEntry = {
    id: string;
    title?: string;
    icon?: string;
};

type WindowSwitcherProps = {
    windows?: WindowEntry[];
    selectedId?: string | null;
    transitionState?: 'entering' | 'entered' | 'exiting' | 'exited';
    onHighlight?: (id: string) => void;
    onSelect?: (id: string) => void;
    onClose?: () => void;
};

const clampIndex = (value: number, length: number) => {
    if (length <= 0) return 0;
    const modulo = ((value % length) + length) % length;
    return modulo;
};

export default function WindowSwitcher({
    windows = [],
    selectedId,
    transitionState = 'entered',
    onHighlight,
    onSelect,
    onClose,
}: WindowSwitcherProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selectedIndex = useMemo(() => {
        if (!windows.length || !selectedId) return windows.length ? 0 : -1;
        const index = windows.findIndex((entry) => entry.id === selectedId);
        return index === -1 ? 0 : index;
    }, [windows, selectedId]);

    useEffect(() => {
        overlayRef.current?.focus();
    }, [windows.length]);

    const highlightByIndex = (nextIndex: number) => {
        if (!windows.length) return;
        const index = clampIndex(nextIndex, windows.length);
        const entry = windows[index];
        if (entry && typeof onHighlight === 'function') {
            onHighlight(entry.id);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!windows.length) {
            if (event.key === 'Escape' && typeof onClose === 'function') {
                event.preventDefault();
                onClose();
            }
            return;
        }

        switch (event.key) {
            case 'Tab': {
                event.preventDefault();
                const direction = event.shiftKey ? -1 : 1;
                highlightByIndex(selectedIndex + direction);
                break;
            }
            case 'ArrowRight':
            case 'ArrowDown': {
                event.preventDefault();
                highlightByIndex(selectedIndex + 1);
                break;
            }
            case 'ArrowLeft':
            case 'ArrowUp': {
                event.preventDefault();
                highlightByIndex(selectedIndex - 1);
                break;
            }
            case 'Home': {
                event.preventDefault();
                highlightByIndex(0);
                break;
            }
            case 'End': {
                event.preventDefault();
                highlightByIndex(windows.length - 1);
                break;
            }
            case 'Enter': {
                event.preventDefault();
                if (typeof onSelect === 'function' && selectedIndex >= 0) {
                    const entry = windows[selectedIndex];
                    if (entry) {
                        onSelect(entry.id);
                    }
                }
                break;
            }
            case 'Escape': {
                event.preventDefault();
                if (typeof onClose === 'function') {
                    onClose();
                }
                break;
            }
            default:
                break;
        }
    };

    const handleOptionClick = (id: string) => {
        if (typeof onSelect === 'function') {
            onSelect(id);
        }
    };

    const handleOptionEnter = (id: string) => {
        if (typeof onHighlight === 'function') {
            onHighlight(id);
        }
    };

    const resolvedSelectedId = windows[selectedIndex]?.id;
    const listboxLabel = 'Running applications';

    const overlayClasses = clsx(
        'fixed inset-0 z-[650] flex items-center justify-center bg-slate-950/70 px-4 py-12 backdrop-blur-xl sm:py-16',
        'transition-opacity duration-200 ease-out',
        transitionState === 'entered' || transitionState === 'entering'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
    );

    const panelClasses = clsx(
        'w-full max-w-4xl transform rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-white shadow-2xl ring-1 ring-white/10',
        'transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange',
        transitionState === 'entered'
            ? 'scale-100 opacity-100'
            : transitionState === 'entering'
                ? 'scale-[0.98] opacity-0'
                : 'scale-95 opacity-0',
    );

    return (
        <div
            ref={overlayRef}
            tabIndex={-1}
            className={overlayClasses}
            role="presentation"
            aria-hidden={windows.length === 0}
            onKeyDown={handleKeyDown}
        >
            <div
                ref={listRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="window-switcher-heading"
                className={panelClasses}
            >
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 id="window-switcher-heading" className="text-lg font-semibold tracking-wide">
                                Switch between applications
                            </h2>
                            <p className="mt-1 text-sm text-white/70">
                                Keep holding Alt and press Tab to cycle apps.
                            </p>
                        </div>
                        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/80">
                            Alt + Tab
                        </div>
                    </div>
                    <div
                        role="listbox"
                        aria-label={listboxLabel}
                        aria-activedescendant={resolvedSelectedId ? `window-switcher-${resolvedSelectedId}` : undefined}
                        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {windows.length === 0 ? (
                            <div className="col-span-full rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                                No other applications are running.
                            </div>
                        ) : (
                            windows.map((entry) => {
                                const isSelected = entry.id === resolvedSelectedId;
                                const optionClasses = clsx(
                                    'flex flex-col gap-3 rounded-2xl border bg-white/5 p-4 text-left shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange',
                                    isSelected
                                        ? 'border-ub-orange/80 bg-ub-orange/10'
                                        : 'border-transparent hover:border-white/20 hover:bg-white/10',
                                );
                                return (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        role="option"
                                        id={`window-switcher-${entry.id}`}
                                        aria-selected={isSelected}
                                        aria-label={entry.title || entry.id}
                                        className={optionClasses}
                                        onMouseEnter={() => handleOptionEnter(entry.id)}
                                        onFocus={() => handleOptionEnter(entry.id)}
                                        onClick={() => handleOptionClick(entry.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {entry.icon ? (
                                                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40">
                                                    <img src={entry.icon} alt="" className="h-8 w-8" />
                                                </span>
                                            ) : (
                                                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-white/70">
                                                    {entry.title?.[0] || entry.id[0] || '?'}
                                                </span>
                                            )}
                                            <span className="truncate text-base font-medium leading-tight">{entry.title || entry.id}</span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
