import React from 'react';
import ExternalFrame from '../ExternalFrame';
import ErrorBoundary from '../ErrorBoundary';

export default function VsCode() {
  return (
    <ErrorBoundary>
      <ExternalFrame
        appId="vscode"
        src="https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md"
        title="VsCode"
        className="h-full w-full bg-ub-cool-grey"
        allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
        allowFullScreen
      />
    </ErrorBoundary>
  );
}

export const displayVsCode = () => {
  return <VsCode />;
};
