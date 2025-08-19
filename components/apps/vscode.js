import React from 'react'

export default function VsCode() {
    return (
        <>
            {/* Only scripts and same-origin needed for GitHub1s */}
            <iframe src="https://github1s.com/Alex-Unnippillil/kali-linux-portfolio" frameBorder="0" title="VsCode" className="h-full w-full bg-ub-cool-grey" sandbox="allow-scripts allow-same-origin"></iframe>
            {/* this is not my work, but it's amazing! */}
            {/* Here is the link to the original repo: https://github.com/conwnet/github1s */}
        </>
    )
}

export const displayVsCode = () => {
    return <VsCode />;
};
