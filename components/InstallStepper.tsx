import React, { useState } from 'react';

export interface InstallStep {
  id: string;
  title: string;
  description: string;
  command: string;
}

interface Props {
  steps: InstallStep[];
}

const InstallStepper: React.FC<Props> = ({ steps }) => {
  const [current, setCurrent] = useState(0);
  const step = steps[current];

  const copy = () => {
    navigator.clipboard.writeText(step.command);
  };

  return (
    <div className="p-4 bg-ub-cool-grey text-white">
      <h3 id={step.id} className="text-xl font-bold mb-2">
        <a href={`#${step.id}`} className="mr-2 text-ubt-blue" aria-label="Anchor">
          #
        </a>
        {step.title}
      </h3>
      <p className="mb-2">{step.description}</p>
      <div className="relative mb-4">
        <pre className="bg-black text-green-400 p-2 overflow-x-auto" aria-label="code">
{step.command}
        </pre>
        <button
          onClick={copy}
          className="absolute top-0 right-0 m-1 px-2 py-1 text-sm bg-gray-700 rounded"
          aria-label="Copy"
        >
          Copy
        </button>
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
          disabled={current === 0}
          className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrent((c) => Math.min(c + 1, steps.length - 1))}
          disabled={current === steps.length - 1}
          className="px-4 py-2 bg-ub-green text-black rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default InstallStepper;
