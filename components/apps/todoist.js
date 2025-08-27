import React from 'react'
import ExternalFrame from '../ExternalFrame'
import ErrorBoundary from '../ErrorBoundary'

export default function Todoist() {
    return (
        <ErrorBoundary>
            <ExternalFrame appId="todoist" className="h-full w-full" />
        </ErrorBoundary>
        // just to bypass the headers 🙃
    )
}

export const displayTodoist = () => {
    return <Todoist />;
};
