import React from 'react';
import ExternalFrame from '../ExternalFrame';

export default function VsCode() {
  return (
    <ExternalFrame
      src="https://vscode.dev/github/Alex-Unnippillil/kali-linux-portfolio"
      title="VsCode"
      className="h-full w-full bg-ub-cool-grey"
      allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
      allowFullScreen
    />
  );
}

export const displayVsCode = () => {
  return <VsCode />;
};
