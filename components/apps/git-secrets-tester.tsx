import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';

export interface PatternInfo {
  name: string;
  regex: string;
  severity: string;
  remediation: string;
}

export interface ScanResult {
  file: string;
  pattern: string;
  match: string;
  index: number;
  severity: string;
  remediation: string;
}

export const defaultPatterns: PatternInfo[] = [
  {
    name: 'AWS Access Key',
    regex: 'AKIA[0-9A-Z]{16}',
    severity: 'high',
    remediation: 'Rotate the key and remove from history.',
  },
  {
    name: 'RSA Private Key',
    regex: '-----BEGIN RSA PRIVATE KEY-----',
    severity: 'critical',
    remediation: 'Remove the private key and generate a new one.',
  },
  {
    name: 'Slack Token',
    regex: 'xox[baprs]-[0-9a-zA-Z]{10,48}',
    severity: 'high',
    remediation: 'Revoke the token and issue a new one.',
  },
];

const MAX_SIZE = 1_000_000; // 1MB

export const redactSecret = (secret: string): string => {
  if (secret.length <= 4) return '***';
  return `${secret.slice(0, 2)}***${secret.slice(-2)}`;
};

const isBinary = (data: Uint8Array): boolean => {
  for (let i = 0; i < data.length && i < 1000; i++) {
    if (data[i] === 0) return true;
  }
  return false;
};

const GitSecretsTester: React.FC = () => {
  const [customPatterns, setCustomPatterns] = useState('');
  const [text, setText] = useState('');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [falsePositives, setFalsePositives] = useState<ScanResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const allPatterns = useMemo(() => {
    const custom = customPatterns
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .map<PatternInfo>((p) => ({
        name: 'Custom',
        regex: p,
        severity: 'medium',
        remediation: 'Review and remove the secret.',
      }));
    return [...defaultPatterns, ...custom];
  }, [customPatterns]);

  const scanText = (file: string, content: string) => {
    const newResults: ScanResult[] = [];
    allPatterns.forEach((pat) => {
      try {
        const re = new RegExp(pat.regex, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(content)) !== null) {
          newResults.push({
            file,
            pattern: pat.name,
            match: redactSecret(m[0]),
            index: m.index,
            severity: pat.severity,
            remediation: pat.remediation,
          });
        }
      } catch (e: any) {
        newResults.push({
          file,
          pattern: pat.regex,
          match: '',
          index: -1,
          severity: 'error',
          remediation: e.message,
        });
      }
    });
    setResults((prev) => [...prev, ...newResults]);
  };

  const handleTextChange = (val: string) => {
    setText(val);
    setResults([]);
    if (val) scanText('input', val);
  };

  const handleFile = async (file: File) => {
    setResults([]);
    setLogs([]);
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files);
      for (const entry of entries) {
        if (entry.dir) continue;
        const data = await entry.async('uint8array');
        if (data.length > MAX_SIZE || isBinary(data)) {
          setLogs((l) => [...l, `Skipped ${entry.name}`]);
          continue;
        }
        const content = new TextDecoder().decode(data);
        scanText(entry.name, content);
      }
    } else {
      const data = new Uint8Array(await file.arrayBuffer());
      if (data.length > MAX_SIZE || isBinary(data)) {
        setLogs([`Skipped ${file.name}`]);
        return;
      }
      const content = new TextDecoder().decode(data);
      scanText(file.name, content);
    }
  };

  const markFalsePositive = (r: ScanResult) => {
    setFalsePositives((prev) => [...prev, r]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 space-y-4 overflow-auto">
      <p className="text-sm text-gray-400">
        Default patterns search for common secrets. Add your own patterns below to
        tune detection. Mark results as false positives to refine future scans.
      </p>
      <div className="bg-gray-800 p-2 rounded">
        <strong>Embedded Patterns:</strong>
        <ul className="list-disc ml-4">
          {defaultPatterns.map((p) => (
            <li key={p.name}>
              <span className="font-mono">{p.regex}</span> – {p.name}
            </li>
          ))}
        </ul>
      </div>
      <textarea
        className="w-full h-24 p-2 bg-black text-green-200 font-mono"
        placeholder="Custom regex patterns, one per line"
        value={customPatterns}
        onChange={(e) => setCustomPatterns(e.target.value)}
      />
      <textarea
        className="w-full h-32 p-2 bg-black text-green-200 font-mono"
        placeholder="Paste text to scan"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
      />
      <input
        type="file"
        accept=".zip,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex-1 space-y-2">
        {results.map((r, idx) => (
          <div key={idx} className="p-2 bg-gray-800 rounded">
            <div>
              <span className="font-mono">{r.pattern}</span> matched &quot;
              <span className="bg-yellow-600 text-black">{r.match}</span>&quot; in {r.file}
              {' '}at {r.index} [{r.severity}]
            </div>
            <div className="text-sm text-gray-300">Remediation: {r.remediation}</div>
            <button
              type="button"
              className="mt-2 px-2 py-1 bg-blue-600 rounded"
              onClick={() => markFalsePositive(r)}
            >
              Mark false positive
            </button>
          </div>
        ))}
        {logs.map((log, idx) => (
          <div key={`log-${idx}`} className="p-2 bg-gray-800 rounded text-sm text-gray-400">
            {log}
          </div>
        ))}
      </div>
      {falsePositives.length > 0 && (
        <div className="bg-yellow-900 p-2 overflow-auto rounded">
          <strong>False Positives:</strong>
          <ul className="list-disc ml-4">
            {falsePositives.map((fp, idx) => (
              <li key={idx}>
                <span className="font-mono">{fp.pattern}</span> – &quot;
                <span className="bg-yellow-600 text-black">{fp.match}</span>&quot; in {fp.file}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GitSecretsTester;

export const displayGitSecretsTester = () => {
  return <GitSecretsTester />;
};

