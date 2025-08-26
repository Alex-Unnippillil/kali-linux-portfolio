import React, { useState, useMemo } from 'react';

export default function VsCode({ repo = 'Alex-Unnippillil/kali-linux-portfolio', directory }) {
  const [errored, setErrored] = useState(false);

  const url = useMemo(() => {
    const base = `https://vscode.dev/github/${repo}`;
    return directory ? `${base}?path=${encodeURIComponent(directory)}` : base;
  }, [repo, directory]);

  const handleError = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setErrored(true);
  };

  const manualOpen = () => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="h-full w-full bg-ub-cool-grey">
      {!errored ? (
        <iframe
          src={url}
          frameBorder="0"
          title="VsCode"
          className="h-full w-full bg-ub-cool-grey"
          allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
          allowFullScreen
          onError={handleError}
        />
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
          <p className="text-white">Unable to embed VS Code.</p>
          <button
            onClick={manualOpen}
            className="px-4 py-2 rounded bg-ub-grey text-white hover:bg-ub-light-purple"
          >
            Open in new tab
          </button>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (repo, directory) => <VsCode repo={repo} directory={directory} />;
