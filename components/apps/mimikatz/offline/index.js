import React, { useState } from 'react';

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

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed = parseDump(text);
        setCredentials(parsed);
        setError(parsed.length ? '' : 'No credentials found');
      })
      .catch(() => {
        setError('Failed to read file');
        setCredentials([]);
      });
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-kali-cool-grey text-white">
      <h1 className="text-xl mb-4">Mimikatz Offline</h1>
      <input
        type="file"
        accept=".txt,.log,application/octet-stream"
        onChange={handleFile}
        className="mb-4"
      />
      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
      <ul className="space-y-2 overflow-auto">
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
  );
};

export default MimikatzOffline;

export const displayMimikatzOffline = (addFolder, openApp) => {
  return <MimikatzOffline addFolder={addFolder} openApp={openApp} />;
};

