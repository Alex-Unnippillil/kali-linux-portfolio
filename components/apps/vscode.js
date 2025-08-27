import React from 'react';
import ExternalFrame from '../ExternalFrame';

export default function VsCode() {
    return (
        <ExternalFrame
            src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
            title="VsCode"
            className="h-full w-full bg-ub-cool-grey"
            allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
            allowFullScreen
            frameBorder="0"
            prefetch={false}
        />
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};

