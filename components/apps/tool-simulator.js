import React, { useState } from 'react';

// Global flag to allow real execution; default is false
export const enableLabMode = false;

const ToolSimulator = ({ toolName, sampleOutput }) => {
  const [args, setArgs] = useState('');
  const [output, setOutput] = useState('');

  const buildCommand = () => `${toolName} ${args}`.trim();

  const run = () => {
    if (!enableLabMode) {
      setOutput(JSON.stringify(sampleOutput, null, 2));
      return;
    }
    // Real execution would occur here in lab mode.
    setOutput('Real execution is disabled in this simulation.');
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <div className="bg-yellow-500 text-black text-center text-xs p-1">
        For lab use only
      </div>
      <div className="p-2 flex space-x-2">
        <input
          type="text"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          placeholder="command options"
          className="flex-grow p-1 rounded text-black"
        />
        <button
          type="button"
          onClick={run}
          className="px-3 py-1 bg-ub-primary rounded"
        >
          Run
        </button>
      </div>
      <div className="px-2 text-xs mb-2">
        Command: <span className="font-mono">{buildCommand() || toolName}</span>
      </div>
      <pre className="flex-grow bg-black text-green-300 p-2 m-2 overflow-auto whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  );
};

export default ToolSimulator;
