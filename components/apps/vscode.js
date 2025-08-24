import React from 'react';
import ExternalFrame from '../ExternalFrame';

export default function VsCode() {
    return (
        <ExternalFrame
            src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
            title="VsCode"
            className="h-full w-full bg-panel"
            allow="clipboard-write"
            allowFullScreen
        />
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};
