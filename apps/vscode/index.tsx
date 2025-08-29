'use client';

import ExternalFrame from '../../components/ExternalFrame';

export default function VSCodeApp() {
  return (
    <ExternalFrame
      src="https://stackblitz.com"
      title="VS Code"
      data-testid="vscode-editor"
    />
  );
}
