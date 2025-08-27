import React from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '../ErrorBoundary';

const ExternalFrame = dynamic(() => import('../ExternalFrame'), { ssr: false });

export default function VsCode() {
    return (
        <ErrorBoundary>
            <div
                role="application"
                aria-label="VsCode"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        window.history.back();
                    }
                }}
                className="h-full w-full"
            >
                <ExternalFrame
                    id="vscode"
                    title="VsCode"
                    className="h-full w-full bg-ub-cool-grey"
                />
            </div>
        </ErrorBoundary>
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};
