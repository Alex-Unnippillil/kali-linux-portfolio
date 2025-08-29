'use client';

import { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useSnippets } from './state/snippets';
import { loadTasks, runTask, Task } from './utils/taskRunner';

const PROJECT = 'demo';

async function saveProject(code: string) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('vscode', { create: true });
    const proj = await dir.getDirectoryHandle(PROJECT, { create: true });
    const file = await proj.getFileHandle('settings.json', { create: true });
    const writable = await file.createWritable();
    await writable.write(JSON.stringify({ code }));
    await writable.close();
  } catch {}
}

async function loadProject(): Promise<string | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('vscode');
    const proj = await dir.getDirectoryHandle(PROJECT);
    const file = await proj.getFileHandle('settings.json');
    const data = await file.getFile();
    const text = await data.text();
    return (JSON.parse(text) as { code: string }).code;
  } catch {
    return null;
  }
}

export default function VsCode() {
  const [code, setCode] = useState('');
  const [lint, setLint] = useState<{ line: number; message: string }[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [language, setLanguage] = usePersistentState('vscode-language', 'javascript');
  const { snippets, addSnippet, removeSnippet } = useSnippets(language);
  const [snippetPrefix, setSnippetPrefix] = useState('');
  const [snippetBody, setSnippetBody] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const lintWorker = useRef<Worker>();
  const runWorker = useRef<Worker>();

  useEffect(() => {
    loadProject().then(async (saved) => {
      if (saved) setCode(saved);
      else {
        const res = await fetch('/data/vscode-example/main.js');
        const sample = await res.text();
        setCode(sample);
        saveProject(sample);
      }
    });

    lintWorker.current = new Worker(new URL('../../workers/webLints.worker.ts', import.meta.url), { type: 'module' });
    runWorker.current = new Worker(new URL('../../workers/jsRunner.ts', import.meta.url), { type: 'module' });

    lintWorker.current.onmessage = (e) => {
      if (e.data.type === 'format') setCode(e.data.formatted);
      if (e.data.type === 'lint') setLint(e.data.messages);
    };

    runWorker.current.onmessage = (e) => {
      const { type, message } = e.data;
      setConsoleOutput((prev) => [...prev, `${type}: ${message}`]);
    };

    return () => {
      lintWorker.current?.terminate();
      runWorker.current?.terminate();
    };
  }, []);

  useEffect(() => {
    loadTasks(PROJECT, language).then(setTasks);
  }, [language]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    saveProject(val);
  };

  const format = () => lintWorker.current?.postMessage({ type: 'format', code });
  const lintCodeFn = () => lintWorker.current?.postMessage({ type: 'lint', code });
  const run = () => {
    setConsoleOutput([]);
    runWorker.current?.postMessage(code);
  };

  const addSnippetHandler = () => {
    if (!snippetPrefix || !snippetBody) return;
    addSnippet({ prefix: snippetPrefix, body: snippetBody });
    setSnippetPrefix('');
    setSnippetBody('');
  };

  const executeTask = async (task: Task) => {
    const result = await runTask(task);
    setConsoleOutput((prev) => [...prev, result]);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex space-x-2 p-2 bg-gray-200">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-2 py-1 rounded"
        >
          <option value="javascript">javascript</option>
          <option value="typescript">typescript</option>
          <option value="python">python</option>
        </select>
        <button className="px-2 py-1 bg-white rounded" onClick={format}>
          Format
        </button>
        <button className="px-2 py-1 bg-white rounded" onClick={lintCodeFn}>
          Lint
        </button>
        <button className="px-2 py-1 bg-white rounded" onClick={run}>
          Run JS
        </button>
      </div>
      <textarea value={code} onChange={onChange} className="flex-1 font-mono p-2" />
      <div className="flex h-40 border-t text-sm">
        <div className="flex-1 overflow-auto p-2 bg-black text-green-400 font-mono">
          {lint.map((m, i) => (
            <div key={i}>{`Line ${m.line}: ${m.message}`}</div>
          ))}
          {consoleOutput.map((m, i) => (
            <div key={`c${i}`}>{m}</div>
          ))}
        </div>
        <div className="w-64 border-l p-2 bg-gray-100 overflow-auto">
          <div>
            <div className="font-bold">Snippets</div>
            {snippets.map((s, i) => (
              <div key={i} className="flex justify-between text-xs mb-1">
                <span>{s.prefix}</span>
                <button onClick={() => removeSnippet(i)}>x</button>
              </div>
            ))}
            <input
              value={snippetPrefix}
              onChange={(e) => setSnippetPrefix(e.target.value)}
              placeholder="prefix"
              className="w-full text-xs border mb-1 px-1"
            />
            <textarea
              value={snippetBody}
              onChange={(e) => setSnippetBody(e.target.value)}
              placeholder="body"
              className="w-full text-xs border mb-1 px-1"
            />
            <button className="px-1 py-0.5 bg-white rounded text-xs" onClick={addSnippetHandler}>
              Add
            </button>
          </div>
          <div className="mt-4">
            <div className="font-bold">Tasks</div>
            {tasks.map((t, i) => (
              <button
                key={i}
                className="block w-full text-left px-2 py-1 bg-white rounded mt-1 text-xs"
                onClick={() => executeTask(t)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
