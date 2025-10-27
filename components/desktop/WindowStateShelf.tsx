'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';

export type WindowShelfEntry = {
    id: string;
    title: string;
    icon?: string;
    hint?: string;
    lastActiveAt?: number;
    closedAt?: number;
};

type WindowShelfProps = {
    label: string;
    entries: WindowShelfEntry[];
    open: boolean;
    onToggle: () => void;
    onActivate: (id: string) => void;
    emptyLabel: string;
    anchor: 'left' | 'right';
    accent: 'minimized' | 'closed';
    actionLabel?: string;
    onRemove?: (id: string) => void;
};

const accentBackground: Record<WindowShelfProps['accent'], string> = {
    minimized: 'from-sky-500/90 via-sky-500/80 to-sky-600/90',
    closed: 'from-slate-600/90 via-slate-600/80 to-slate-700/90',
};

const badgeStyles: Record<WindowShelfProps['accent'], string> = {
    minimized: 'bg-sky-400/20 text-sky-100',
    closed: 'bg-slate-500/25 text-slate-100',
};

const badgeLabels: Record<WindowShelfProps['accent'], string> = {
    minimized: 'Minimized',
    closed: 'Recently closed',
};

function StatusIcon({ accent }: { accent: WindowShelfProps['accent'] }) {
    if (accent === 'minimized') {
        return (
            <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3 w-3"
                fill="currentColor"
            >
                <path d="M4 14.5h12a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5H4a.5.5 0 0 0-.5.5v1c0 .28.22.5.5.5Z" />
                <path d="M10 4a.5.5 0 0 0-.5.5v4.586L7.354 6.94a.5.5 0 0 0-.708.707l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 1 0-.708-.707L10.5 9.086V4.5A.5.5 0 0 0 10 4Z" />
            </svg>
        );
    }

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-3 w-3"
            fill="currentColor"
        >
            <path d="M6.146 6.146a.5.5 0 0 1 .708 0L10 9.293l3.146-3.147a.5.5 0 0 1 .708.708L10.707 10l3.147 3.146a.5.5 0 0 1-.708.708L10 10.707l-3.146 3.147a.5.5 0 0 1-.708-.708L9.293 10 6.146 6.854a.5.5 0 0 1 0-.708Z" />
        </svg>
    );
}

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-sky-300';

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return null;
    }
    const diff = Date.now() - timestamp;
    if (!Number.isFinite(diff) || diff < 0) {
        return null;
    }
    const seconds = Math.floor(diff / 1000);
    if (seconds < 45) return 'moments ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
}

function renderIcon(entry: WindowShelfEntry) {
    if (entry.icon) {
        return (
            <Image
                src={entry.icon.replace('./', '/')}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 flex-shrink-0 rounded"
            />
        );
    }

    const fallbackLetter = entry.title?.charAt(0)?.toUpperCase() || '…';
    return (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-slate-700/80 text-base font-semibold">
            {fallbackLetter}
        </span>
    );
}

function WindowStateShelf({
    label,
    entries,
    open,
    onToggle,
    onActivate,
    emptyLabel,
    anchor,
    accent,
    actionLabel,
    onRemove,
}: WindowShelfProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const entryRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const containerClasses = clsx(
        'pointer-events-auto fixed bottom-4 z-[240] w-[18rem] max-w-[92vw] text-sm text-white drop-shadow-xl',
        anchor === 'left' ? 'left-4' : 'right-4',
    );

    const headerClasses = clsx(
        'flex w-full items-center justify-between rounded-lg border border-white/10 bg-gradient-to-br px-3 py-2',
        accentBackground[accent],
    );

    const toggleClasses = clsx(
        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-white/90 transition-colors hover:text-white',
        focusRing,
    );

    const listWrapperClasses = clsx(
        'mt-2 overflow-hidden rounded-lg border border-white/10 bg-slate-950/80 backdrop-blur',
        open ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0',
        'transition-all duration-200 ease-out',
    );

    const count = entries.length;
    const resolvedAction = actionLabel || (accent === 'minimized' ? 'Restore window' : 'Reopen window');
    const statusLabel = badgeLabels[accent];

    useEffect(() => {
        if (!count) {
            setActiveIndex(0);
            return;
        }
        setActiveIndex((previous) => {
            if (previous < count) {
                return previous;
            }
            return Math.max(0, count - 1);
        });
    }, [count]);

    useEffect(() => {
        if (open && count > 0) {
            entryRefs.current[activeIndex]?.focus({ preventScroll: true });
        }
    }, [open, count, activeIndex]);

    const handleEntryKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (!count) return;
        let nextIndex = index;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault();
            nextIndex = (index + 1) % count;
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            event.preventDefault();
            nextIndex = (index - 1 + count) % count;
        } else if (event.key === 'Home') {
            event.preventDefault();
            nextIndex = 0;
        } else if (event.key === 'End') {
            event.preventDefault();
            nextIndex = count - 1;
        }

        if (nextIndex !== index) {
            setActiveIndex(nextIndex);
            entryRefs.current[nextIndex]?.focus({ preventScroll: true });
        }
    };

    const resolveSubtitle = useMemo(() => {
        return (entry: WindowShelfEntry): string => {
            if (entry.hint && entry.hint.trim()) {
                return entry.hint.trim();
            }
            if (accent === 'closed') {
                const relative = formatRelativeTime(entry.closedAt);
                if (relative) {
                    return `Closed ${relative}`;
                }
            }
            const lastActive = formatRelativeTime(entry.lastActiveAt);
            if (lastActive) {
                return `Last active ${lastActive}`;
            }
            return resolvedAction;
        };
    }, [accent, resolvedAction]);

    return (
        <aside className={containerClasses} aria-label={`${label} panel`}>
            <div className={headerClasses}>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    className={toggleClasses}
                >
                    <span>{label}</span>
                    <span className={clsx('ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', badgeStyles[accent])}>
                        {count}
                    </span>
                </button>
            </div>
            <div className={listWrapperClasses} aria-hidden={!open}>
                <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto p-2" role="list">
                    {count === 0 ? (
                        <li className="px-2 py-4 text-center text-xs text-white/60">{emptyLabel}</li>
                    ) : (
                        entries.map((entry, index) => (
                            <li key={entry.id} className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => onActivate(entry.id)}
                                    onKeyDown={(event) => handleEntryKeyDown(event, index)}
                                    onFocus={() => setActiveIndex(index)}
                                    tabIndex={!open ? -1 : activeIndex === index ? 0 : -1}
                                    className={clsx(
                                        'flex flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:text-white/95',
                                        focusRing,
                                    )}
                                    ref={(node) => {
                                        entryRefs.current[index] = node;
                                    }}
                                >
                                    {renderIcon(entry)}
                                    <span className="flex flex-col text-left">
                                        <span className="flex items-center gap-2 text-sm font-semibold leading-tight">
                                            {entry.title}
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide',
                                                    badgeStyles[accent],
                                                )}
                                            >
                                                <StatusIcon accent={accent} />
                                                <span>{statusLabel}</span>
                                            </span>
                                        </span>
                                        <span className="text-[0.7rem] text-white/70">{resolveSubtitle(entry)}</span>
                                    </span>
                                </button>
                                {onRemove ? (
                                    <button
                                        type="button"
                                        aria-label={`Remove ${entry.title} from ${label}`}
                                        onClick={() => onRemove(entry.id)}
                                        className={clsx(
                                            'rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white',
                                            focusRing,
                                        )}
                                    >
                                        <span aria-hidden="true">×</span>
                                    </button>
                                ) : null}
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </aside>
    );
}

export function MinimizedWindowShelf(props: Omit<WindowShelfProps, 'anchor' | 'accent'>) {
    return (
        <WindowStateShelf
            {...props}
            anchor="left"
            accent="minimized"
        />
    );
}

export function ClosedWindowShelf(props: Omit<WindowShelfProps, 'anchor' | 'accent'>) {
    return (
        <WindowStateShelf
            {...props}
            anchor="right"
            accent="closed"
        />
    );
}

export default WindowStateShelf;
