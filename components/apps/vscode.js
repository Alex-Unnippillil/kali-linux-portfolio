import React from 'react';
import LazyIframe from '../util-components/LazyIframe';

export default function VsCode() {
    return (
        <LazyIframe
            src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
            title="VsCode"
            className="h-full w-full bg-panel"
            allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
            allowFullScreen
            frameBorder="0"
        />
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};
