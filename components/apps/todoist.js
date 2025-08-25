import React from 'react'
import { withGameErrorBoundary } from './GameErrorBoundary';

function Todoist() {
    return (
        <iframe src="https://todoist.com/showProject?id=220474322" frameBorder="0" title="Todoist" className="h-full w-full"></iframe>
        // just to bypass the headers 🙃
    )
}

export const displayTodoist = () => {
    return <TodoistWithBoundary />;
};

const TodoistWithBoundary = withGameErrorBoundary(Todoist);
export default TodoistWithBoundary;
