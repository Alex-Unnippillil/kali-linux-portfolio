import React from 'react';
import ExternalFrame from '../ExternalFrame';
import ErrorBoundary from '../ErrorBoundary';

export default function Todoist() {
  return (
    <ErrorBoundary>
      <ExternalFrame
        appId="todoist"
        src="https://todoist.com/showProject?id=220474322"
        title="Todoist"
        className="h-full w-full"
      />
    </ErrorBoundary>
  );
}

export const displayTodoist = () => {
  return <Todoist />;
};
