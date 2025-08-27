import React, { useState } from 'react';

const modulesData = [
  {
    name: 'sekurlsa',
    description: 'Retrieve credentials from memory',
    sampleOutput: 'sekurlsa::logonpasswords\n[REDACTED]',
    hardening:
      'https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/credential-guard',
  },
  {
    name: 'lsadump',
    description: 'Dump LSASS secrets',
    sampleOutput: 'lsadump::lsa /patch\n[REDACTED]',
    hardening:
      'https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection',
  },
  {
    name: 'misc',
    description: 'Miscellaneous helper commands',
    sampleOutput: 'misc::cmd\n[REDACTED]',
    hardening:
      'https://learn.microsoft.com/en-us/windows/security/threat-protection/windows-security-baselines',
  },
];

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
    const mod = modules.find((m) => m.name === cmd);
    const result = mod?.sampleOutput || `[${cmd} output redacted]`;
    setOutput(result);
    addHistory(cmd, result);
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
    const msg = '[Template execution redacted]';
    setOutput(msg);
    addHistory(script, msg);
  };

  return (
    <div className="h-full w-full flex text-white">
      <div className="w-1/4 bg-ub-dark p-2 overflow-y-auto">
        <h2 className="text-lg mb-2">Modules</h2>
        <ul>
          {modules.map((m) => (
            <li key={m.name} className="mb-2">
              <button
                className="w-full text-left py-1 hover:bg-ub-cool-grey"
                onClick={() => runCommand(m.name)}
              >
                {m.name}
              </button>
              <p className="text-xs">{m.description}</p>
              <a
                className="text-xs text-blue-400 underline"
                href={m.hardening}
                target="_blank"
                rel="noopener noreferrer"
              >
                Windows hardening tips
              </a>
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
