import React, { useCallback, useEffect, useState } from 'react';
import CredentialArtifactLocator from './CredentialLocator';
import modulesData from './modules.json';

// Sample outputs for demonstration only. No real credentials are processed.
const sampleOutputs = {
  sekurlsa: `Authentication Id : 0 ; 999 (00000000:000003E7)
User Name         : alice
Domain            : CONTOSO
Password          : P@ssw0rd!
NTLM              : 8846f7eaee8fb117ad06bdd830b7586c`,
  lsadump: `LSA Secret       : DefaultPassword
Key              : _SC_MachineAccount
Credential       : SuperSecretValue`,
  misc: 'Sample output: miscellaneous helper command.',
};

const mitigations = [
  {
    item: 'Enable LSA Protection',
    risk: 'Prevents credential dumping by blocking code injection into LSASS.',
  },
  {
    item: 'Disable WDigest',
    risk: 'Stops storage of clear-text passwords in memory.',
  },
  {
    item: 'Use strong passwords and MFA',
    risk: 'Reduces the impact of credential theft.',
  },
];

const severityClass = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  info: '',
};

const parseOutput = (text, redact) => {
  return text.split(/\r?\n/).map((line) => {
    let severity = 'info';
    if (/password|ntlm|credential/i.test(line)) {
      severity = 'high';
    } else if (/lsa|secret/i.test(line)) {
      severity = 'medium';
    }
    const redactedLine = redact
      ? line.replace(/(:\s*)(.+)/, '$1[REDACTED]')
      : line;
    return { line: redactedLine, severity };
  });
};

const MimikatzApp = () => {
  const [modules] = useState(modulesData);
  const [output, setOutput] = useState('');
  const [parsed, setParsed] = useState([]);
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
  const [redact, setRedact] = useState(true);

  useEffect(() => {
    setParsed(parseOutput(output, redact));
  }, [output, redact]);

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

  const copyOutput = useCallback(() => {
    if (typeof window !== 'undefined') {
      const text = parsed.map((p) => p.line).join('\n');
      try {
        navigator.clipboard?.writeText(text);
      } catch {
        // ignore copy errors
      }
    }
  }, [parsed]);

  const mask = (text) =>
    redact ? text.replace(/(:\s*)(.+)/g, '$1[REDACTED]') : text;

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
        <p className="text-xs italic mt-2">
          Sample modules only. No real credentials are processed.
        </p>
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
        <p className="text-sm mb-4 italic">
          All outputs are sample data. Uploads are disabled.
        </p>
        <label className="flex items-center space-x-2 mb-2">
          <input
            type="checkbox"
            checked={redact}
            onChange={() => setRedact((r) => !r)}
          />
          <span>Redact secrets</span>
        </label>
        <button
          type="button"
          className="mb-4 px-2 py-1 bg-blue-700 rounded"
          onClick={copyOutput}
        >
          Copy Output
        </button>
        <pre className="whitespace-pre-wrap mb-4">
          {parsed.map((p, idx) => (
            <div key={idx} className={severityClass[p.severity]}>
              {p.line}
            </div>
          ))}
        </pre>
        <CredentialArtifactLocator />
        <h2 className="text-lg mt-4 mb-2">Mitigations</h2>
        <ul className="list-disc pl-4 mb-4">
          {mitigations.map((m, idx) => (
            <li key={idx}>
              <span className="font-semibold">{m.item}:</span> {m.risk}
            </li>
          ))}
        </ul>
        <h2 className="text-lg mb-2">History</h2>
        <ul className="space-y-1">
          {history.map((h, idx) => (
            <li key={idx}>
              <span className="text-xs text-gray-300">{h.timestamp}</span> -{' '}
              <span className="font-bold">{h.command}</span>
              <pre className="whitespace-pre-wrap">{mask(h.output)}</pre>
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

