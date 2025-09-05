import React, { useState, useEffect, useRef } from 'react';
import UbuntuApp from '../base/ubuntu_app';

export default function SearchModal({ registry = [], openApp, close }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(registry);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    useEffect(() => {
        const lower = query.toLowerCase();
        setResults(
            registry.filter((app) => app.title.toLowerCase().includes(lower))
        );
    }, [query, registry]);

    const handleBackground = (e) => {
        if (e.target === e.currentTarget) close();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95"
            onClick={handleBackground}
        >
            <input
                ref={inputRef}
                className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                placeholder="Search"
                aria-label="Search applications"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                {results.map((app) => (
                    <UbuntuApp
                        key={app.id}
                        name={app.title}
                        id={app.id}
                        icon={app.icon}
                        disabled={app.disabled}
                        prefetch={app.screen?.prefetch}
                        openApp={(id) => {
                            if (typeof openApp === 'function') openApp(id);
                            close();
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

