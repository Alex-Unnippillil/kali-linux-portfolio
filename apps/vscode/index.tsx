'use client';

import ExternalFrame from '../../components/ExternalFrame';

export default function VsCode() {
  return (
    <div className="h-full w-full flex max-w-full">
      <ExternalFrame src="https://vscode.dev/" title="VsCode" />
    </div>
  );
}
