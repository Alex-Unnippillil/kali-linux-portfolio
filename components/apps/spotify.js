import React from 'react';

function XApp() {
    return (
        <div className="h-full w-full bg-ub-cool-grey flex items-center justify-center">
            <a
                href="https://twitter.com/AUnnippillil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
            >
                View @AUnnippillil on X
            </a>
        </div>
    );
}

export const displayX = () => <XApp />;
export const displaySpotify = displayX;

export default XApp;

