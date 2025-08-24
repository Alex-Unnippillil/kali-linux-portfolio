import React, { useState, useMemo, useRef, useEffect } from 'react';
import JSZip from 'jszip';

export interface PatternInfo {
  name: string;
  regex: string;
  severity: string;
  remediation: string;
  whitelist: string;
}

export interface ScanResult {
  file: string;
  pattern: string;
  match: string;
  index: number;
  line: number;
  severity: string;
  confidence: string;
  remediation: string;
  whitelist: string;
}

interface DiffLine {
  file: string;
  line: string;
  lineNumber: number | null;
  type: 'context' | 'add' | 'remove';
}

export const defaultPatterns: PatternInfo[] = [
  {
    name: 'AWS Access Key',
    regex: 'AKIA[0-9A-Z]{16}',
    severity: 'high',
    remediation: 'Rotate the key and remove from history.',
    whitelist: 'git secrets --add "AKIA[0-9A-Z]{16}"',
  },
  {
    name: 'RSA Private Key',
    regex: '-----BEGIN RSA PRIVATE KEY-----',
    severity: 'critical',
    remediation: 'Remove the private key and generate a new one.',
    whitelist: 'git secrets --add "-----BEGIN RSA PRIVATE KEY-----"',
  },
  {
    name: 'Slack Token',
    regex: 'xox[baprs]-[0-9a-zA-Z]{10,48}',
    severity: 'high',
    remediation: 'Revoke the token and issue a new one.',
    whitelist: 'git secrets --add "xox[baprs]-[0-9a-zA-Z]{10,48}"',
  },
];

const MAX_SIZE = 1_000_000; // 1MB

export const redactSecret = (secret: string): string => {
  if (secret.length <= 4) return '***';
  return `${secret.slice(0, 2)}***${secret.slice(-2)}`;
};

const shannonEntropy = (str: string): number => {
  const freq: Record<string, number> = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  let e = 0;
  const len = str.length;
  Object.values(freq).forEach((f) => {
    const p = f / len;
    e -= p * Math.log2(p);
  });
  return e;
};

const isBinary = (data: Uint8Array): boolean => {
  for (let i = 0; i < data.length && i < 1000; i += 1) {
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
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [patch, setPatch] = useState('');
  const [archive, setArchive] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./git-secrets-tester.worker.ts', import.meta.url),
      { type: 'module' },
    );
    const worker = workerRef.current;
    worker.onmessage = (e: MessageEvent) => {
      const { results: r } = e.data as { results?: ScanResult[] };
      if (r) setResults((prev) => [...prev, ...r]);
    };
    return () => worker.terminate();
  }, []);

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

  const scanLine = (
    file: string,
    lineContent: string,
    lineNumber: number,
  ): { safe: string; results: ScanResult[] } => {
    const lineResults: ScanResult[] = [];
    let safe = lineContent;

    allPatterns.forEach((pat) => {
      try {
        const re = new RegExp(pat.regex, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(lineContent)) !== null) {
          lineResults.push({
            file,
            pattern: pat.name,
            match: redactSecret(m[0]),
            index: m.index,
            line: lineNumber,
            severity: pat.severity,
            confidence: 'high',
            remediation: pat.remediation,
            whitelist: pat.whitelist,
          });
          safe = safe.replace(m[0], redactSecret(m[0]));
        }
      } catch (e: any) {
        lineResults.push({
          file,
          pattern: pat.regex,
          match: '',
          index: -1,
          line: lineNumber,
          severity: 'error',
          confidence: 'low',
          remediation: e.message,
          whitelist: pat.whitelist,
        });
      }
    });

    const heur = /(password|secret|api[-_]?key|token)\s*[:=]\s*['"]?([^'"\s]+)/i.exec(
      lineContent,
    );
    if (heur) {
      const secret = heur[2];
      lineResults.push({
        file,
        pattern: `Keyword ${heur[1]}`,
        match: redactSecret(secret),
        index: lineContent.indexOf(secret),
        line: lineNumber,
        severity: 'medium',
        confidence: 'low',
        remediation: 'Avoid hardcoding credentials.',
        whitelist: 'git secrets --add -l "pattern"',
      });
      safe = safe.replace(secret, redactSecret(secret));
    }

    const tokens = lineContent.match(/[A-Za-z0-9\/+=]{20,}/g) || [];
    tokens.forEach((token) => {
      const ent = shannonEntropy(token);
      if (ent > 4) {
        lineResults.push({
          file,
          pattern: 'High Entropy String',
          match: redactSecret(token),
          index: lineContent.indexOf(token),
          line: lineNumber,
          severity: 'medium',
          confidence: 'medium',
          remediation: 'Verify this string is not a secret.',
          whitelist: 'git secrets --add -l "pattern"',
        });
        safe = safe.replace(token, redactSecret(token));
      }
    });

    return { safe, results: lineResults };
  };

  const scanFile = (file: string, content: string) => {
    const res: ScanResult[] = [];
    content.split(/\r?\n/).forEach((line, idx) => {
      const { results: r } = scanLine(file, line, idx + 1);
      res.push(...r);
    });
    setResults((prev) => [...prev, ...res]);
  };

  const parsePatch = (p: string) => {
    const lines = p.split(/\r?\n/);
    const diffLines: DiffLine[] = [];
    const res: ScanResult[] = [];
    let currentFile = '';
    let ln = 0;
    lines.forEach((line) => {
      if (line.startsWith('+++')) {
        currentFile = line.replace('+++ b/', '').replace('+++ ', '');
        diffLines.push({ file: currentFile, line, lineNumber: null, type: 'context' });
      } else if (line.startsWith('@@')) {
        const m = /@@ .* \+(\d+)/.exec(line);
        ln = m ? parseInt(m[1], 10) - 1 : 0;
        diffLines.push({ file: currentFile, line, lineNumber: null, type: 'context' });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        ln += 1;
        const { safe, results: r } = scanLine(currentFile, line.slice(1), ln);
        diffLines.push({
          file: currentFile,
          line: `+${safe}`,
          lineNumber: ln,
          type: 'add',
        });
        res.push(...r);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        const { safe } = scanLine(currentFile, line.slice(1), ln);
        diffLines.push({
          file: currentFile,
          line: `-${safe}`,
          lineNumber: null,
          type: 'remove',
        });
      } else {
        ln += 1;
        const { safe } = scanLine(currentFile, line, ln);
        diffLines.push({ file: currentFile, line: safe, lineNumber: ln, type: 'context' });
      }
    });
    setDiff(diffLines);
    setResults((prev) => [...prev, ...res]);
  };

  const handleTextChange = (val: string) => {
    setText(val);
    setResults([]);
    setDiff([]);
    setArchive(null);
    setPatch('');
    if (val) scanFile('input', val);
  };

  const handleFile = async (file: File) => {
    setResults([]);
    setLogs([]);
    setDiff([]);
    setPatch('');
    setArchive(null);
    if (file.name.endsWith('.patch') || file.name.endsWith('.diff')) {
      const p = await file.text();
      setPatch(p);
      parsePatch(p);
      return;
    }
    if (file.name.endsWith('.zip')) {
      const buf = await file.arrayBuffer();
      setArchive(Buffer.from(buf).toString('base64'));
      workerRef.current?.postMessage({ type: 'scan-archive', buffer: buf });
      const zip = await JSZip.loadAsync(buf);
      const entries = Object.values(zip.files);
      for (const entry of entries) {
        if (entry.dir) continue;
        const data = await entry.async('uint8array');
        if (data.length > MAX_SIZE || isBinary(data)) {
          setLogs((l) => [...l, `Skipped ${entry.name}`]);
          continue;
        }
        const content = new TextDecoder().decode(data);
        scanFile(entry.name, content);
      }
    } else {
      const data = new Uint8Array(await file.arrayBuffer());
      if (data.length > MAX_SIZE || isBinary(data)) {
        setLogs([`Skipped ${file.name}`]);
        return;
      }
      const content = new TextDecoder().decode(data);
      setPatch(content);
      scanFile(file.name, content);
    }
  };

  const markFalsePositive = (r: ScanResult) => {
    setFalsePositives((prev) => [...prev, r]);
  };

  const summary = useMemo(() => {
    const m: Record<string, { counts: Record<string, number>; remediations: string[] }> = {};
    results.forEach((r) => {
      if (!m[r.severity]) m[r.severity] = { counts: {}, remediations: [] };
      m[r.severity].counts[r.confidence] =
        (m[r.severity].counts[r.confidence] || 0) + 1;
      if (!m[r.severity].remediations.includes(r.remediation))
        m[r.severity].remediations.push(r.remediation);
    });
    return m;
  }, [results]);

  const runServerScan = async () => {
    try {
      const body: any = {};
      if (archive) body.archive = archive;
      if (patch || text) body.patch = patch || text;
      const res = await fetch('/api/git-secrets-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (Array.isArray(data.results)) {
        setResults((prev) => [...prev, ...data.results]);
      } else {
        setLogs((l) => [...l, 'Server scan did not return results']);
      }
      if (Array.isArray(data.logs)) setLogs((l) => [...l, ...data.logs]);
    } catch (e: any) {
      setLogs((l) => [...l, `Server scan failed: ${e.message}`]);
    }
  };

  const downloadLogs = () => {
    if (logs.length === 0) return;
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'git-secrets.log';
    a.click();
    URL.revokeObjectURL(url);
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
        accept=".zip,.txt,.patch,.diff"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        type="button"
        className="px-2 py-1 bg-purple-700 rounded w-40"
        onClick={runServerScan}
      >
        Server scan
      </button>
      <button
        type="button"
        className="px-2 py-1 bg-gray-700 rounded w-40"
        onClick={downloadLogs}
      >
        Download logs
      </button>
      {Object.keys(summary).length > 0 && (
        <div className="bg-gray-800 p-2 rounded">
          <strong>Summary:</strong>
          <ul className="list-disc ml-4">
            {Object.entries(summary).map(([sev, info]) => (
              <li key={sev}>
                {sev} –
                {Object.entries(info.counts)
                  .map(([conf, c]) => `${conf}: ${c}`)
                  .join(', ')}
                <ul className="list-disc ml-4 text-sm">
                  {info.remediations.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      {diff.length > 0 && (
        <div className="bg-gray-800 p-2 rounded overflow-auto">
          <pre className="font-mono text-sm">
            {diff.map((d, idx) => {
              const annotations = results.filter(
                (r) => r.file === d.file && r.line === d.lineNumber,
              );
              return (
                <div key={idx} className="flex">
                  <span className="w-16 text-right pr-2 text-gray-500">
                    {d.lineNumber ?? ''}
                  </span>
                  <span
                    className={`flex-1 whitespace-pre ${{
                      add: 'text-green-400',
                      remove: 'text-red-400',
                      context: '',
                    }[d.type]}`}
                  >
                    {d.line}
                  </span>
                  {annotations.map((a, i) => (
                    <span
                      key={i}
                      className="ml-2 text-xs bg-red-700 text-white px-1 rounded"
                    >
                      {a.pattern}
                    </span>
                  ))}
                </div>
              );
            })}
          </pre>
        </div>
      )}
      <div className="flex-1 space-y-2">
        {results.map((r, idx) => (
          <div key={idx} className="p-2 bg-gray-800 rounded">
            <div>
              <span className="font-mono">{r.pattern}</span> matched &quot;
              <span className="bg-yellow-600 text-black">{r.match}</span>&quot; in {r.file}
              {' '}at {r.line}:{r.index} [{r.severity}/{r.confidence}]
            </div>
            <div className="text-sm text-gray-300 flex items-center"><span className="flex-1">Remediation: {r.remediation}</span><button type="button" className="ml-2 px-1 bg-gray-700 rounded" onClick={() => navigator.clipboard.writeText(r.remediation)}>Copy</button></div>
            <div className="text-sm text-gray-300 flex items-center mt-1"><span className="flex-1">Whitelist: {r.whitelist}</span><button type="button" className="ml-2 px-1 bg-gray-700 rounded" onClick={() => navigator.clipboard.writeText(r.whitelist)}>Copy</button></div>
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

