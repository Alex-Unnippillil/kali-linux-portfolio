import React from 'react';

const TaskbarRunningIndicator = () => (
        <span
                aria-hidden="true"
                data-testid="running-indicator"
                className="absolute -bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-current"
        />
);

export default TaskbarRunningIndicator;
