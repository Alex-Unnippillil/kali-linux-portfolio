import React, { useEffect, useMemo, useState } from 'react';

const MimikatzApp = () => {
  const [modules, setModules] = useState([]);
  const [output, setOutput] = useState('');
  const [history, setHistory] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'user', direction: 'asc' });
  const [templates, setTemplates] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('mimikatz-templates') || '[]');
    } catch {
      return [];
    }
  });
  const [templateName, setTemplateName] = useState('');
  const [templateScript, setTemplateScript] = useState('');

  useEffect(() => {
    fetch('/api/mimikatz')
      .then((res) => res.json())
      .then((data) => setModules(data.modules || []));
  }, []);

  const addHistory = (command, text) => {
    setHistory((h) => [
      { timestamp: new Date().toISOString(), command, output: text },
      ...h,
    ]);
  };

  const parseCredentials = (text) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .map((line) => line.split(':'))
      .filter((parts) => parts.length === 2)
      .map(([user, password]) => ({ user: user.trim(), password: password.trim() }));
  };

  const runCommand = async (cmd) => {
    try {
      const res = await fetch(
        `/api/mimikatz?command=${encodeURIComponent(cmd)}`
      );
      const data = await res.json();
      const text = data.output || '';
      setOutput(text);
      setCredentials(parseCredentials(text));
      addHistory(cmd, text);
    } catch (err) {
      const msg = `Error: ${err.message}`;
      setOutput(msg);
      setCredentials([]);
      addHistory(cmd, msg);
    }
  };

  const saveTemplate = () => {
    if (!templateName || !templateScript) return;
    const next = [...templates, { name: templateName, script: templateScript }];
    setTemplates(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mimikatz-templates', JSON.stringify(next));
    }
    setTemplateName('');
    setTemplateScript('');
  };

  const runTemplate = async (script) => {
    try {
      const res = await fetch('/api/mimikatz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      const text = data.output || '';
      setOutput(text);
      setCredentials(parseCredentials(text));
      addHistory(script, text);
    } catch (err) {
      const msg = `Error: ${err.message}`;
      setOutput(msg);
      setCredentials([]);
      addHistory(script, msg);
    }
  };

  const sortedCredentials = useMemo(() => {
    const sorted = [...credentials];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key].toLowerCase();
      const bVal = b[sortConfig.key].toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [credentials, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((current) => {
      const direction =
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction };
    });
  };

  return (
    <div className="h-full w-full flex text-white">
      <div className="w-1/4 bg-ub-dark p-2 overflow-y-auto">
        <h2 className="text-lg mb-2">Modules</h2>
        <ul>
          {modules.map((m) => (
            <li key={m.name}>
              <button
                className="w-full text-left py-1 hover:bg-ub-cool-grey"
                onClick={() => runCommand(m.name)}
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
        <h2 className="text-lg mt-4">Templates</h2>
        <ul>
          {templates.map((t, idx) => (
            <li key={idx}>
              <button
                className="w-full text-left py-1 hover:bg-ub-cool-grey"
                onClick={() => runTemplate(t.script)}
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <input
            className="w-full p-1 text-black"
            placeholder="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <textarea
            className="w-full p-1 text-black"
            placeholder="Mimikatz script"
            value={templateScript}
            onChange={(e) => setTemplateScript(e.target.value)}
          />
          <button
            className="w-full bg-blue-600 rounded py-1"
            onClick={saveTemplate}
          >
            Save Template
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 bg-ub-cool-grey overflow-auto">
        <h1 className="text-lg mb-4">Mimikatz</h1>
        <pre className="whitespace-pre-wrap mb-4">{output}</pre>
        {sortedCredentials.length > 0 && (
          <>
            <h2 className="text-lg mb-2">Recovered Credentials</h2>
            <table className="credentials-table mb-4">
              <thead>
                <tr>
                  <th onClick={() => requestSort('user')}>Username</th>
                  <th onClick={() => requestSort('password')}>Password</th>
                </tr>
              </thead>
              <tbody>
                {sortedCredentials.map((cred, idx) => (
                  <tr key={idx}>
                    <td>{cred.user}</td>
                    <td>{cred.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <h2 className="text-lg mb-2">History</h2>
        <ul className="space-y-1">
          {history.map((h, idx) => (
            <li key={idx}>
              <span className="text-xs text-gray-300">{h.timestamp}</span> -{' '}
              <span className="font-bold">{h.command}</span>
              <pre className="whitespace-pre-wrap">{h.output}</pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};
