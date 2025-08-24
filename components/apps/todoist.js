import React from 'react';
import LazyIframe from '../util-components/LazyIframe';

export default function Todoist() {
    return (
        <LazyIframe
            src="https://todoist.com/showProject?id=220474322"
            title="Todoist"
            className="h-full w-full"
            frameBorder="0"
        />
    );
    // just to bypass the headers 🙃

}

export const displayTodoist = () => {
    return <Todoist />;
};
