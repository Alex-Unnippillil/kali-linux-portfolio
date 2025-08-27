import React from 'react';
import ExternalFrame from '../ExternalFrame';
import ErrorBoundary from '../ErrorBoundary';

export default function VsCode() {
    return (
        <ErrorBoundary>
            <ExternalFrame
                appId="vscode"
                className="h-full w-full bg-ub-cool-grey"
                allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
                allowFullScreen
            />
        </ErrorBoundary>
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};
