import React from 'react'

export default function Todoist() {
    return (
        <>
            {/* Allows forms and scripts for Todoist project interface */}
            <iframe src="https://todoist.com/showProject?id=220474322" frameBorder="0" title="Todoist" className="h-full w-full" sandbox="allow-forms allow-scripts allow-same-origin"></iframe>
            {/* just to bypass the headers 🙃 */}
        </>
    )
}

export const displayTodoist = () => {
    return <Todoist />;
};
