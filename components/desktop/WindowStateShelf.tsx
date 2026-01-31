'use client';

import React from 'react';
import Image from 'next/image';
import clsx from 'clsx';

export type WindowShelfEntry = {
    id: string;
    title: string;
    icon?: string;
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

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-sky-300';

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
    const containerClasses = clsx(
        'pointer-events-auto fixed bottom-4 z-[240] w-[calc(50vw-0.75rem)] md:w-[18rem] max-w-[92vw] text-sm text-white drop-shadow-xl',
        anchor === 'left' ? 'left-2 md:left-4' : 'right-2 md:right-4',
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
                        entries.map((entry) => (
                            <li key={entry.id} className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => onActivate(entry.id)}
                                    className={clsx(
                                        'flex flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:text-white/95',
                                        focusRing,
                                    )}
                                >
                                    {renderIcon(entry)}
                                    <span className="flex flex-col text-left">
                                        <span className="text-sm font-semibold leading-tight">{entry.title}</span>
                                        <span className="text-[0.7rem] uppercase tracking-wide text-white/60">{resolvedAction}</span>
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
