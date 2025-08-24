import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  PatternInfo,
  ScanResult,
  DiffLine,
  defaultPatterns,
} from './git-secrets-tester.utils';

const GitSecretsTester: React.FC = () => {
  const [customPatterns, setCustomPatterns] = useState('');
  const [text, setText] = useState('');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [falsePositives, setFalsePositives] = useState<ScanResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [patch, setPatch] = useState('');
  const [archive, setArchive] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

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

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./git-secrets-tester.worker.ts', import.meta.url),
      { type: 'module' },
    );
    const worker = workerRef.current;
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as any;
      if (msg.type === 'results') {
        if (msg.results) setResults((prev) => [...prev, ...msg.results]);
        if (msg.diff) setDiff(msg.diff);
        if (msg.logs) setLogs((l) => [...l, ...msg.logs]);
        setProgress(null);
      } else if (msg.type === 'progress') {
        setProgress({ current: msg.current, total: msg.total });
      } else if (msg.type === 'canceled') {
        setProgress(null);
      }
    };
    return () => worker.terminate();
  }, []);

  const handleTextChange = (val: string) => {
    setText(val);
    setResults([]);
    setDiff([]);
    setArchive(null);
    setPatch('');
    workerRef.current?.postMessage({ type: 'cancel' });
    if (val) {
      workerRef.current?.postMessage({
        type: 'scan-text',
        text: val,
        patterns: allPatterns,
      });
    }
  };

  const handleFile = async (file: File) => {
    setResults([]);
    setLogs([]);
    setDiff([]);
    setPatch('');
    setArchive(null);
    workerRef.current?.postMessage({ type: 'cancel' });
    const patterns = allPatterns;
    if (file.name.endsWith('.patch') || file.name.endsWith('.diff')) {
      const p = await file.text();
      setPatch(p);
      workerRef.current?.postMessage({ type: 'scan-patch', patch: p, patterns });
      return;
    }
    if (file.name.endsWith('.zip')) {
      const buf = await file.arrayBuffer();
      setArchive(Buffer.from(buf).toString('base64'));
      workerRef.current?.postMessage({ type: 'scan-archive', buffer: buf, patterns });
    } else {
      const content = await file.text();
      setPatch(content);
      workerRef.current?.postMessage({
        type: 'scan-file',
        name: file.name,
        content,
        patterns,
      });
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
      {progress && (
        <div className="flex items-center space-x-2">
          <span>
            Scanning {progress.current}/{progress.total}
          </span>
          <button
            type="button"
            className="px-2 py-1 bg-red-700 rounded"
            onClick={() => workerRef.current?.postMessage({ type: 'cancel' })}
          >
            Cancel
          </button>
        </div>
      )}
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
                    className={`flex-1 whitespace-pre ${
                      {
                        add: 'text-green-400',
                        remove: 'text-red-400',
                        context: '',
                      }[d.type]
                    }`}
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
              <span className="bg-yellow-600 text-black">{r.match}</span>&quot; in {r.file}{' '}
              at {r.line}:{r.index} [{r.severity}/{r.confidence}]
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
export { defaultPatterns, redactSecret } from './git-secrets-tester.utils';
export type { PatternInfo, ScanResult, DiffLine } from './git-secrets-tester.utils';
