import React, { useState } from 'react';
import eventLogsData from './eventLogs.json';
import lsassDiagrams from './lsass.json';

// Storyboard UI showing attack steps and mitigations.
const MimikatzApp = () => {
  const [tab, setTab] = useState('attack');
  const [logs, setLogs] = useState(eventLogsData);

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) setLogs(data);
      } catch {
        // ignore malformed files
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full flex flex-col text-white">
      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-2 ${
            tab === 'attack' ? 'bg-red-700' : 'bg-red-600'
          }`}
          onClick={() => setTab('attack')}
        >
          Red Team
        </button>
        <button
          className={`px-4 py-2 ${
            tab === 'defense' ? 'bg-blue-700' : 'bg-blue-600'
          }`}
          onClick={() => setTab('defense')}
        >
          Blue Team
        </button>
      </div>
      {tab === 'attack' ? (
        <div className="p-4 overflow-auto flex-1 bg-ub-cool-grey">
          <h2 className="text-lg mb-2">Attack Storyboard</h2>
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="mb-4"
          />
          <ul className="space-y-2">
            {logs.map((l, idx) => (
              <li key={idx} className="bg-ub-dark p-2 rounded">
                <div className="font-bold">Step {idx + 1}: {l.step}</div>
                <div className="text-sm">{l.log}</div>
                {l.mitigation && (
                  <div className="text-xs text-blue-300 mt-1">
                    Mitigation: {l.mitigation}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <h3 className="text-lg mb-2">LSASS Diagram</h3>
            <pre className="bg-black p-2 whitespace-pre-wrap">
              {lsassDiagrams[0]?.diagram}
            </pre>
          </div>
        </div>
      ) : (
        <div className="p-4 overflow-auto flex-1 bg-ub-cool-grey">
          <h2 className="text-lg mb-2">Mitigation Tips</h2>
          <ul className="list-disc pl-4 space-y-1">
            {logs.map((l, idx) => (
              <li key={idx}>
                <span className="font-semibold">{l.step}</span>: {l.mitigation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};
