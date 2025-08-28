import React, { useState } from 'react';
import ExternalFrame from '../ExternalFrame';

const FILE_OPTIONS = [
    { label: 'README.md', value: 'README.md' },
    { label: 'pages/index.tsx', value: 'pages/index.tsx' },
    { label: 'components/apps/vscode.js', value: 'components/apps/vscode.js' },
];

export default function VsCode() {
    const [loaded, setLoaded] = useState(false);
    const [path, setPath] = useState('README.md');

    const src = `https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=${encodeURIComponent(path)}`;

    return (
        <div className="relative h-full w-full">
            <div className="absolute top-2 left-2 z-10 flex gap-2">
                <select
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="text-xs bg-white text-black p-1 rounded"
                >
                    {FILE_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                            {f.label}
                        </option>
                    ))}
                </select>
                <a
                    href={src}
                    target="_blank"
                    rel="noopener"
                    className="px-2 py-1 text-xs bg-white text-black rounded"
                >
                    Open externally
                </a>
            </div>
            {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-ub-cool-grey" />
            )}
            <ExternalFrame
                src={src}
                title="VsCode"
                className={`h-full w-full bg-ub-cool-grey ${loaded ? 'block' : 'hidden'}`}
                sandbox="allow-scripts allow-same-origin"
                allow="clipboard-write"
                allowFullScreen
                frameBorder="0"
                prefetch={false}
                loading="lazy"
                onLoad={() => setLoaded(true)}
            />
        </div>
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};

