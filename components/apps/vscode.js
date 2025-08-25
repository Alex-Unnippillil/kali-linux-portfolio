import React from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

function VsCode() {
    return (
        <iframe
            src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
            frameBorder="0"
            title="VsCode"
            className="h-full w-full bg-ub-cool-grey"
            allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
            allowFullScreen
        ></iframe>
    );
}

export const displayVsCode = () => {
    return <VsCodeWithBoundary />;
};

const VsCodeWithBoundary = withGameErrorBoundary(VsCode);
export default VsCodeWithBoundary;
