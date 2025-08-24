import React, { useEffect, useRef, useState } from 'react';
import Editor from 'react-simple-code-editor';

const examples = [
  {
    name: 'Simple string match',
    rule: `rule Example {
  strings:
    $a = "test"
  condition:
    $a
}`,
  },
  {
    name: 'Hex bytes',
    rule: `rule HexExample {
  strings:
    $a = { 31 32 33 }
  condition:
    $a
}`,
  },
];

const sampleArtifacts = [
  { name: 'Hello World', data: 'Hello world this is a test.' },
  { name: 'Lorem Ipsum', data: 'Lorem ipsum dolor sit amet.' },
];

interface RuleFile {
  name: string;
  content: string;
}

interface MatchDetail {
  rule: string;
  tags?: string[];
  meta?: Record<string, string>;
  matches: { identifier: string; data: string; offset: number; length: number }[];
  file?: string;
}

interface CompileError {
  message: string;
  line?: number;
  column?: number;
  warning?: boolean;
}

const toHex = (s: string): string =>
  Array.from(s)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ');

const highlight = (code: string) =>
  code
    .replace(/(rule|strings|condition|meta|include)/g, '<span class="text-purple-400">$1</span>')
    .replace(/("[^"]*")/g, '<span class="text-green-300">$1</span>')
    .replace(/(\$[a-zA-Z0-9_]+)/g, '<span class="text-blue-300">$1</span>');

const YaraTester: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const runTimer = useRef<NodeJS.Timeout | null>(null);

  const [rules, setRules] = useState<RuleFile[]>([
    { name: 'main.yar', content: examples[0].rule },
  ]);
  const [currentRule, setCurrentRule] = useState(0);
  const [input, setInput] = useState('');
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [compileErrors, setCompileErrors] = useState<CompileError[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [fileTimes, setFileTimes] = useState<{ name: string; elapsed: number }[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored = localStorage.getItem('yaraRules');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRules(parsed);
      } catch {
        // ignore invalid data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('yaraRules', JSON.stringify(rules));
  }, [rules]);

  const createWorker = () => {
    const w = new Worker(new URL('./worker.ts', import.meta.url));
    w.onmessage = (ev: MessageEvent) => {
      const data = ev.data as any;
      if (data.type === 'lintResult') {
        setCompileErrors(data.errors);
      } else if (data.type === 'match') {
        const m: MatchDetail = data.match;
        if (data.file) m.file = data.file;
        setMatches((prev) => [...prev, m]);
      } else if (data.type === 'fileResult') {
        setFileTimes((prev) => [...prev, { name: data.file, elapsed: data.elapsed }]);
      } else if (data.type === 'corpusDone') {
        if (runTimer.current) clearTimeout(runTimer.current);
        setCompileErrors(data.compileErrors);
        setHeatmap(data.heatmap);
        setRuntimeError(null);
        setRunning(false);
      } else if (data.type === 'result') {
        if (runTimer.current) clearTimeout(runTimer.current);
        setCompileErrors(data.compileErrors);
        setElapsed(data.elapsed ?? null);
        setRuntimeError(null);
        setRunning(false);
      } else if (data.type === 'runtimeError') {
        if (runTimer.current) clearTimeout(runTimer.current);
        setMatches([]);
        setFileTimes([]);
        setHeatmap({});
        setElapsed(null);
        setRuntimeError(data.error);
        setRunning(false);
      }
    };
    return w;
  };

  useEffect(() => {
    workerRef.current = createWorker();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const ruleMap = Object.fromEntries(rules.map((r) => [r.name, r.content]));
      workerRef.current?.postMessage({ type: 'lint', rules: ruleMap });
    }, 300);
    return () => clearTimeout(id);
  }, [rules]);

  const gotoLine = (line?: number, column?: number) => {
    if (!line) return;
    const textarea = document.getElementById('rule-editor') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const lines = textarea.value.split('\n');
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i += 1) pos += lines[i].length + 1;
    if (column && column > 0) pos += column - 1;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  };

  const handleFile = async (file: File) => {
    if (file.size > 1024 * 1024) {
      setRuntimeError('File too large');
      return;
    }
    if (!file.type.startsWith('text') && file.type !== 'application/octet-stream') {
      setRuntimeError('Unsupported file type');
      return;
    }
    const reader = file.stream().getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
    setInput(result);
  };

  const runRules = () => {
    if (!workerRef.current) return;
    if (input.length > 1024 * 1024) {
      setRuntimeError('Sample too large');
      return;
    }
    setRunning(true);
    setRuntimeError(null);
    setMatches([]);
    setFileTimes([]);
    setHeatmap({});
    const ruleMap = Object.fromEntries(rules.map((r) => [r.name, r.content]));
    workerRef.current.postMessage({
      type: 'run',
      rules: ruleMap,
      input,
      limits: { cpu: 5000, mem: 50 * 1024 * 1024 },
    });
    runTimer.current = setTimeout(() => {
      workerRef.current?.terminate();
      workerRef.current = createWorker();
      setRuntimeError('Scan timed out');
      setRunning(false);
    }, 5000);
  };

  const runCorpus = () => {
    if (!workerRef.current) return;
    setRunning(true);
    setRuntimeError(null);
    setMatches([]);
    setFileTimes([]);
    setHeatmap({});
    const ruleMap = Object.fromEntries(rules.map((r) => [r.name, r.content]));
    workerRef.current.postMessage({
      type: 'runCorpus',
      rules: ruleMap,
      corpus: sampleArtifacts,
      limits: { cpu: 5000, mem: 50 * 1024 * 1024 },
    });
    runTimer.current = setTimeout(() => {
      workerRef.current?.terminate();
      workerRef.current = createWorker();
      setRuntimeError('Scan timed out');
      setRunning(false);
    }, 5000);
  };

  const addRule = () => {
    const name = `rule${rules.length + 1}.yar`;
    setRules([...rules, { name, content: '' }]);
    setCurrentRule(rules.length);
  };

  const removeRule = (idx: number) => {
    const arr = rules.filter((_, i) => i !== idx);
    setRules(arr);
    setCurrentRule(0);
  };

  const exportRules = () => {
    const blob = new Blob([JSON.stringify(rules)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMatches = () => {
    const blob = new Blob([JSON.stringify(matches, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matches.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCurrentRule = () => {
    navigator.clipboard.writeText(rules[currentRule]?.content || '');
  };

  const copyMatches = () => {
    if (matches.length === 0) return;
    navigator.clipboard.writeText(JSON.stringify(matches, null, 2));
  };

  const importPack = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (
          Array.isArray(data) &&
          data.every(
            (r) => typeof r?.name === 'string' && typeof r?.content === 'string'
          )
        )
          setRules(data);
      } catch {
        // ignore
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2 items-center">
        <select
          className="bg-black text-green-200 p-1"
          defaultValue=""
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            if (!Number.isNaN(idx)) {
              const arr = [...rules];
              arr[currentRule].content = examples[idx].rule;
              setRules(arr);
            }
          }}
        >
          <option value="" disabled>
            Example rules
          </option>
          {examples.map((ex, idx) => (
            <option key={ex.name} value={idx}>
              {ex.name}
            </option>
          ))}
        </select>
        <select
          className="bg-black text-green-200 p-1"
          onChange={(e) => {
            const art = sampleArtifacts[parseInt(e.target.value, 10)];
            if (art) setInput(art.data);
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Sample artifacts
          </option>
          {sampleArtifacts.map((a, i) => (
            <option key={a.name} value={i}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
          onClick={runRules}
          disabled={running}
        >
          Run
        </button>
        <button
          type="button"
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
          onClick={runCorpus}
          disabled={running}
        >
          Run Corpus
        </button>
        <button type="button" className="bg-gray-700 px-2" onClick={addRule}>
          +
        </button>
        {rules.length > 1 && (
          <button
            type="button"
            className="bg-gray-700 px-2"
            onClick={() => removeRule(currentRule)}
          >
            -
          </button>
        )}
        <button type="button" className="bg-gray-700 px-2" onClick={exportRules}>
          Export Rules
        </button>
        <button type="button" className="bg-gray-700 px-2" onClick={exportMatches} disabled={matches.length === 0}>
          Export Matches
        </button>
        <button type="button" className="bg-gray-700 px-2" onClick={copyCurrentRule}>
          Copy Rule
        </button>
        <button
          type="button"
          className="bg-gray-700 px-2"
          onClick={copyMatches}
          disabled={matches.length === 0}
        >
          Copy Matches
        </button>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importPack(file);
          }}
        />
      </div>
      <div className="flex space-x-2 mb-2">
        {rules.map((r, idx) => (
          <button
            key={r.name}
            type="button"
            className={`px-2 ${idx === currentRule ? 'bg-gray-700' : 'bg-gray-800'}`}
            onClick={() => setCurrentRule(idx)}
          >
            {r.name}
          </button>
        ))}
      </div>
      <Editor
        value={rules[currentRule]?.content}
        onValueChange={(v) => {
          const arr = [...rules];
          arr[currentRule].content = v;
          setRules(arr);
        }}
        highlight={(code) => highlight(code)}
        padding={10}
        textareaId="rule-editor"
        className="w-full h-32 bg-black text-green-200 font-mono"
      />
      {compileErrors.length > 0 && (
        <div className="bg-red-800 p-2 overflow-auto">
          <strong>Compile Errors:</strong>
          <ul>
            {compileErrors.map((e, idx) => (
              <li
                key={idx}
                className="cursor-pointer"
                onClick={() => gotoLine(e.line, e.column)}
              >
                {e.line
                  ? `Line ${e.line}${e.column !== undefined ? `, Col ${e.column}` : ''}: `
                  : ''}
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex space-x-2 items-center">
        <textarea
          className="flex-1 h-24 p-2 bg-black text-green-200 font-mono"
          placeholder="Paste text to scan..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {runtimeError && (
        <div className="bg-red-900 p-2">Runtime error: {runtimeError}</div>
      )}
      {matches.length > 0 && (
        <div className="bg-gray-800 p-2 overflow-auto">
          <div className="flex justify-between">
            <strong>Matches:</strong>
            {elapsed !== null && <span>Runtime: {elapsed.toFixed(2)} ms</span>}
          </div>
          <table className="w-full text-sm text-left font-mono">
            <thead>
              <tr>
                <th className="px-1">Rule</th>
                <th className="px-1">File</th>
                <th className="px-1">Tags</th>
                <th className="px-1">Meta</th>
                <th className="px-1">Identifier</th>
                <th className="px-1">Data</th>
                <th className="px-1">Offset</th>
                <th className="px-1">Length</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, idx) =>
                m.matches.map((d, j) => (
                  <tr key={`${idx}-${j}`}>
                    <td className="px-1">{m.rule}</td>
                    <td className="px-1">{m.file || ''}</td>
                    <td className="px-1">{m.tags?.join(', ') || ''}</td>
                    <td className="px-1">
                      {m.meta
                        ? Object.entries(m.meta)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(', ')
                        : ''}
                    </td>
                    <td className="px-1">{d.identifier}</td>
                    <td className="px-1">"{d.data}" ({toHex(d.data)})</td>
                    <td className="px-1">{d.offset}</td>
                    <td className="px-1">{d.length}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {fileTimes.length > 0 && (
        <div className="bg-gray-800 p-2 overflow-auto">
          <strong>File timings:</strong>
          <ul>
            {fileTimes.map((f) => (
              <li key={f.name}>
                {f.name}: {f.elapsed.toFixed(2)} ms
              </li>
            ))}
          </ul>
        </div>
      )}
      {Object.keys(heatmap).length > 0 && (
        <div className="bg-gray-800 p-2 overflow-auto">
          <strong>Rule heatmap:</strong>
          <ul>
            {Object.entries(heatmap).map(([rule, count]) => (
              <li key={rule}>
                {rule}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default YaraTester;

