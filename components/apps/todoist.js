import React from 'react';
import ExternalFrame from '../ExternalFrame';

export default function Todoist() {
    return (
        <ExternalFrame
            src="https://todoist.com/showProject?id=220474322"
            frameBorder="0"
            title="Todoist"
            className="h-full w-full"
        />
        // just to bypass the headers 🙃
    )
}

export const displayTodoist = () => {
    return <Todoist />;
};
