import React, { useEffect, useState } from 'react';
import ExternalFrame from '../ExternalFrame';

export default function VsCode() {
    const [cookiesEnabled, setCookiesEnabled] = useState(true);

    useEffect(() => {
        try {
            document.cookie = 'vscookie=1';
            setCookiesEnabled(document.cookie.includes('vscookie=1'));
            document.cookie = 'vscookie=1; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        } catch {
            setCookiesEnabled(false);
        }
    }, []);

    return (
        <div className="h-full w-full flex flex-col">
            {!cookiesEnabled && (
                <div className="bg-yellow-300 text-black p-2 text-sm" role="alert">
                    Third-party cookies are blocked. Please{' '}
                    <a
                        className="underline"
                        href="https://support.google.com/chrome/answer/95647"
                        target="_blank"
                        rel="noreferrer"
                    >
                        enable cookies
                    </a>{' '}
                    to use VS Code.
                </div>
            )}
            <ExternalFrame
                src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
                frameBorder="0"
                title="VsCode"
                className="flex-grow w-full bg-ub-cool-grey"
                allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
                allowFullScreen
                prefetch={false}
            />
        </div>
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};
