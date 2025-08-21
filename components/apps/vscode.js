import React from 'react';

export default function VsCode() {
    return (
        <iframe
            src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
            frameBorder="0"
            title="VsCode"
            className="h-full w-full bg-ub-cool-grey"
            allow="accelerometer; camera; gyroscope;"
        ></iframe>
    );
}

export const displayVsCode = () => {
    return <VsCode />;
};
