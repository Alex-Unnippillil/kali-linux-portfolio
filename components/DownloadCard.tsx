"use client";

import copyToClipboard from '../utils/clipboard';

export interface Step {
  text: string;
  command: string;
}

interface Props {
  title: string;
  steps: Step[];
}

export default function DownloadCard({ title, steps }: Props) {
  const handleCopy = (cmd: string) => {
    copyToClipboard(cmd);
  };

  return (
    <details className="bg-black/30 rounded">
      <summary className="cursor-pointer p-4 font-bold list-none">{title}</summary>
      <ol className="p-4 space-y-4">
        {steps.map((step, idx) => (
          <li key={idx} className="space-y-2">
            <p>{step.text}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/50 p-2 rounded break-all">{step.command}</code>
              <button
                className="px-2 py-1 bg-blue-600 text-white rounded"
                onClick={() => handleCopy(step.command)}
                aria-label="Copy command"
              >
                Copy
              </button>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

