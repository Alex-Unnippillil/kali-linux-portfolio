import React, { useState } from 'react';
import Redactor from '../../../../apps/mimikatz/offline/components/Redactor';

const parseDump = (text) => {
  const lines = text.split(/\r?\n/);
  const creds = [];
  let current = {};
  const userRegex = /user(?:name)?\s*[:=]\s*(\S+)/i;
  const passRegex = /pass(?:word)?\s*[:=]\s*(\S+)/i;

  lines.forEach((line) => {
    const u = line.match(userRegex);
    const p = line.match(passRegex);
    if (u) current.user = u[1];
    if (p) current.password = p[1];
    if (current.user && current.password) {
      creds.push(current);
      current = {};
    }
  });
  return creds;
};

const MimikatzOffline = () => {
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState('');
  const [rawDump, setRawDump] = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed = parseDump(text);
        setRawDump(text);
        setCredentials(parsed);
        setError(parsed.length ? '' : 'No credentials found');
      })
      .catch(() => {
        setError('Failed to read file');
        setCredentials([]);
        setRawDump('');
      });
  };

  return (
    <div className="h-full w-full flex flex-col gap-4 p-4 bg-ub-cool-grey text-white overflow-hidden">
      <h1 className="text-xl mb-4">Mimikatz Offline</h1>
      <input
        type="file"
        accept=".txt,.log,application/octet-stream"
        onChange={handleFile}
        className="mb-4"
      />
      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 flex-1 min-h-0">
        <div className="flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-2">Parsed credentials</h2>
          <ul className="space-y-2 overflow-auto pr-1">
            {credentials.map((c, idx) => (
              <li key={idx} className="bg-ub-dark p-2 rounded">
                <div>User: {c.user}</div>
                <div>Password: {c.password}</div>
              </li>
            ))}
          </ul>
          {!credentials.length && !error && (
            <div className="text-sm text-gray-300">No credentials parsed</div>
          )}
        </div>
        <Redactor initialValue={rawDump} />
      </div>
    </div>
  );
};

export default MimikatzOffline;

export const displayMimikatzOffline = (addFolder, openApp) => {
  return <MimikatzOffline addFolder={addFolder} openApp={openApp} />;
};

