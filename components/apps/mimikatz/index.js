import React, { useState } from 'react';

const MimikatzApp = () => {
  const [output, setOutput] = useState('');

  const runCommand = async (cmd) => {
    try {
      const res = await fetch(`/api/mimikatz?command=${cmd}`);
      const text = await res.text();
      setOutput(text);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <h1 className="text-lg mb-4">Mimikatz</h1>
      <div className="mb-4 space-x-2">
        <button
          className="px-3 py-1 bg-blue-600 rounded"
          onClick={() => runCommand('sekurlsa')}
        >
          sekurlsa
        </button>
        <button
          className="px-3 py-1 bg-green-600 rounded"
          onClick={() => runCommand('lsadump')}
        >
          lsadump
        </button>
      </div>
      <pre className="whitespace-pre-wrap">{output}</pre>
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};

