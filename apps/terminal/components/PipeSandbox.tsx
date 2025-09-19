'use client';

import React, { useState } from 'react';

export default function PipeSandbox() {
  const [command, setCommand] = useState(
    'cat fruits.txt | grep a | sort | uniq',
  );
  const [output, setOutput] = useState('');

  function run() {
    setOutput('');
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(
        new URL('../workers/pipelineWorker.mts', import.meta.url),
      );
      worker.onmessage = (e: MessageEvent<any>) => {
        const { type, chunk } = e.data || {};
        if (type === 'data') setOutput((o) => o + chunk);
      };
      worker.postMessage({
        action: 'run',
        command,
        files: {
          'fruits.txt': 'banana\napple\nbanana\ncherry\napple\n',
        },
      });
    }
  }

  return (
    <div className="space-y-2 p-4">
      <input
        className="w-full border px-2 py-1"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
      />
      <button className="border px-2 py-1" onClick={run}>
        Run
      </button>
      <pre className="whitespace-pre-wrap bg-black p-2 text-green-500">
        {output}
      </pre>
    </div>
  );
}
