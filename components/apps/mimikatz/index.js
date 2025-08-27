import React, { useState } from 'react';
import CredentialArtifactLocator from './CredentialLocator';
import modulesData from './modules.json';

// Mimikatz simulator: displays sample data only. Uploads and real credential handling are disabled.
const sampleOutputs = {
  sekurlsa: 'Sample output: dumped credentials (not real).',
  lsadump: 'Sample output: LSASS secrets (not real).',
  misc: 'Sample output: miscellaneous helper command.',
};

const MimikatzApp = () => {
  const [modules] = useState(modulesData);
  const [output, setOutput] = useState('');
  const [history, setHistory] = useState([]);
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

  const addHistory = (command, text) => {
    setHistory((h) => [
      { timestamp: new Date().toISOString(), command, output: text },
      ...h,
    ]);
  };

  const runCommand = (cmd) => {
    const text = sampleOutputs[cmd] || 'Unknown command';
    setOutput(text);
    addHistory(cmd, text);
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

  const runTemplate = (script) => {
    const msg = 'Template execution disabled. Uploads are not permitted.';
    setOutput(msg);
    addHistory(script, msg);
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
        <p className="text-xs italic mt-2">Sample modules only. No real credentials are processed.</p>
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
        <h1 className="text-lg mb-4">Mimikatz (Sample Simulator)</h1>
        <p className="text-sm mb-4 italic">All outputs are sample data. Uploads are disabled.</p>
        <pre className="whitespace-pre-wrap mb-4">{output}</pre>
        <CredentialArtifactLocator />
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
