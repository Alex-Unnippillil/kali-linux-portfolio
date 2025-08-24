import React, { useEffect, useRef, useState } from 'react';

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

interface MatchDetail {
  rule: string;
  matches: { identifier: string; data: string; offset: number; length: number }[];
}

interface CompileError {
  message: string;
  line?: number;
  warning?: boolean;
}

const toHex = (s: string): string =>
  Array.from(s)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ');

const YaraTester: React.FC = () => {
  const ruleRef = useRef<HTMLTextAreaElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const runTimer = useRef<NodeJS.Timeout | null>(null);

  const [rules, setRules] = useState(examples[0].rule);
  const [input, setInput] = useState('');
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [compileErrors, setCompileErrors] = useState<CompileError[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const createWorker = () => {
    const w = new Worker(new URL('./worker.ts', import.meta.url));
    w.onmessage = (ev: MessageEvent) => {
      const data = ev.data as any;
      if (data.type === 'lintResult') {
        setCompileErrors(data.errors);
      } else if (data.type === 'result') {
        if (runTimer.current) clearTimeout(runTimer.current);
        setMatches(data.matches);
        setCompileErrors(data.compileErrors);
        setRuntimeError(null);
        setRunning(false);
      } else if (data.type === 'runtimeError') {
        if (runTimer.current) clearTimeout(runTimer.current);
        setMatches([]);
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
      workerRef.current?.postMessage({ type: 'lint', rules });
    }, 300);
    return () => clearTimeout(id);
  }, [rules]);

  const gotoLine = (line?: number) => {
    if (!line || !ruleRef.current) return;
    const textarea = ruleRef.current;
    const lines = textarea.value.split('\n');
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i += 1) pos += lines[i].length + 1;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  };

  const handleFile = async (file: File) => {
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
    setRunning(true);
    setRuntimeError(null);
    workerRef.current.postMessage({ type: 'run', rules, input, timeout: 5000 });
    runTimer.current = setTimeout(() => {
      workerRef.current?.terminate();
      workerRef.current = createWorker();
      setRuntimeError('Scan timed out');
      setRunning(false);
    }, 5000);
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2 items-center">
        <select
          className="bg-black text-green-200 p-1"
          defaultValue=""
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            if (!Number.isNaN(idx)) setRules(examples[idx].rule);
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
        <button
          type="button"
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
          onClick={runRules}
          disabled={running}
        >
          Run
        </button>
      </div>
      <textarea
        ref={ruleRef}
        className="w-full h-32 p-2 bg-black text-green-200 font-mono"
        value={rules}
        onChange={(e) => setRules(e.target.value)}
      />
      {compileErrors.length > 0 && (
        <div className="bg-red-800 p-2 overflow-auto">
          <strong>Compile Errors:</strong>
          <ul>
            {compileErrors.map((e, idx) => (
              <li
                key={idx}
                className="cursor-pointer"
                onClick={() => gotoLine(e.line)}
              >
                {e.line ? `Line ${e.line}: ` : ''}
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
          <strong>Matches:</strong>
          <ul>
            {matches.map((m, idx) => (
              <li key={idx} className="mb-2">
                <div className="font-bold">{m.rule}</div>
                <ul className="ml-4 list-disc">
                  {m.matches.map((d, j) => (
                    <li key={j} className="font-mono">
                      {d.identifier} @ {d.offset} len {d.length}: "{d.data}" ({toHex(d.data)})
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default YaraTester;

