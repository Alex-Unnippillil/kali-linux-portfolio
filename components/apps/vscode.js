import React, { useState } from 'react';
import ExternalFrame from '../ExternalFrame';

export default function VsCode() {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="relative h-full w-full">
            {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-ub-cool-grey" />
            )}
            <ExternalFrame
                src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
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

