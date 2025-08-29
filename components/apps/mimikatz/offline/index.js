import React, { useState } from 'react';

// Offline LSASS dump parser. Processes uploaded files locally
// without making any network requests.
const MimikatzOffline = () => {
  const [creds, setCreds] = useState([]);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result.toString();
        const lines = text.split(/\r?\n/);
        const entries = lines
          .map((line) => {
            const match = line.match(/([^\s:]+)[\s:]+([^\s]+)/);
            return match ? { user: match[1], pass: match[2] } : null;
          })
          .filter(Boolean);
        setCreds(entries);
        setError('');
      } catch {
        setError('Failed to parse dump');
        setCreds([]);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-xl mb-4">Mimikatz Offline Dump Parser</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Process LSASS dump files locally. No network requests are made.
      </p>
      <input
        type="file"
        accept=".txt,.log,.dmp,.json"
        onChange={handleFile}
        className="mb-4"
        aria-label="dump file"
      />
      {error && <div className="text-red-400 mb-2">{error}</div>}
      {creds.length > 0 && (
        <table className="text-xs w-full border border-gray-700">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-2 py-1 text-left">Username</th>
              <th className="px-2 py-1 text-left">Password</th>
            </tr>
          </thead>
          <tbody>
            {creds.map((c, i) => (
              <tr key={i} className="odd:bg-gray-800">
                <td className="px-2 py-1">{c.user}</td>
                <td className="px-2 py-1">{c.pass}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MimikatzOffline;

export const displayMimikatzOffline = (addFolder, openApp) => (
  <MimikatzOffline addFolder={addFolder} openApp={openApp} />
);
