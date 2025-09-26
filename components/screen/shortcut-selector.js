import React, { useCallback, useMemo, useRef, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import useFocusTrap from '../../hooks/useFocusTrap';

function ShortcutSelector({ apps = [], games = [], onSelect, onClose }) {
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    const combinedApps = useMemo(() => {
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        return combined;
    }, [apps, games]);

    const filteredApps = useMemo(() => {
        if (!query) return combinedApps;
        const lower = query.toLowerCase();
        return combinedApps.filter((app) => app.title.toLowerCase().includes(lower));
    }, [combinedApps, query]);

    const handleChange = useCallback((event) => {
        setQuery(event.target.value);
    }, []);

    const handleClose = useCallback(() => {
        if (typeof onClose === 'function') {
            onClose();
        }
    }, [onClose]);

    const handleSelect = useCallback(
        (id) => {
            if (typeof onSelect === 'function') {
                onSelect(id);
            }
            handleClose();
        },
        [handleClose, onSelect],
    );

    useFocusTrap(true, containerRef, {
        initialFocusRef: searchInputRef,
        onEscape: handleClose,
    });

    return (
        <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-selector-title"
            className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim"
            tabIndex={-1}
        >
            <header className="mt-8 mb-4 flex w-full max-w-4xl items-center justify-between px-6">
                <h1 id="shortcut-selector-title" className="text-xl font-semibold text-white">
                    Add shortcut
                </h1>
                <button
                    type="button"
                    onClick={handleClose}
                    className="rounded bg-black bg-opacity-30 px-3 py-1 text-sm text-white transition hover:bg-opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Close shortcut selector"
                >
                    Close
                </button>
            </header>
            <input
                ref={searchInputRef}
                className="mb-8 w-2/3 rounded bg-black bg-opacity-20 px-4 py-2 text-white focus:outline-none md:w-1/3"
                placeholder="Search"
                value={query}
                onChange={handleChange}
                aria-label="Search shortcuts"
            />
            <div className="grid grid-cols-3 gap-6 place-items-center pb-10 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {filteredApps.map((app) => (
                    <UbuntuApp
                        key={app.id}
                        name={app.title}
                        id={app.id}
                        icon={app.icon}
                        openApp={() => handleSelect(app.id)}
                        disabled={app.disabled}
                        prefetch={app.screen?.prefetch}
                    />
                ))}
            </div>
            <button
                type="button"
                className="mb-8 rounded bg-black bg-opacity-30 px-4 py-2 text-sm text-white transition hover:bg-opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={handleClose}
            >
                Cancel
            </button>
        </div>
    );
}

export default ShortcutSelector;
