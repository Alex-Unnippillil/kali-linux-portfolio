'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(async () => {
  await import('monaco-editor/esm/vs/language/typescript/monaco.contribution');
  const mod = await import('@monaco-editor/react');
  return mod.default;
}, { ssr: false });

type FS = Record<string, string>;
const FS_KEY = 'vscode-fs';
const RECENT_KEY = 'vscode-recent';

function languageFromPath(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.html')) return 'html';
  return 'plaintext';
}

const loadFS = (): FS => {
  try {
    const raw = localStorage.getItem(FS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const initial: FS = { 'hello.txt': 'Hello World' };
  localStorage.setItem(FS_KEY, JSON.stringify(initial));
  return initial;
};

export default function VSCodeApp() {
  const [fs, setFS] = useState<FS>({});
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [quick, setQuick] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [findVisible, setFindVisible] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState<{ path: string; line: number; match: string }[]>([]);
  const [theme, setTheme] = useState<'vs' | 'vs-dark'>('vs-dark');
  const [wrap, setWrap] = useState<'on' | 'off'>('on');
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const data = loadFS();
    setFS(data);
    const t = localStorage.getItem('theme');
    setTheme(t === 'light' ? 'vs' : 'vs-dark');
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') setTheme(e.newValue === 'light' ? 'vs' : 'vs-dark');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const open = (path: string) => {
    if (!(path in fs)) {
      const newFS = { ...fs, [path]: '' };
      setFS(newFS);
      localStorage.setItem(FS_KEY, JSON.stringify(newFS));
    }
    const idx = openFiles.indexOf(path);
    if (idx !== -1) setActive(idx);
    else {
      setOpenFiles([...openFiles, path]);
      setActive(openFiles.length);
    }
    const recent = [path, ...JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((p: string) => p !== path)].slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  };

  const activePath = openFiles[active];
  const activeContent = activePath ? fs[activePath] : '';

  const onChange = (val?: string) => {
    if (!activePath) return;
    const newFS = { ...fs, [activePath]: val || '' };
    setFS(newFS);
    localStorage.setItem(FS_KEY, JSON.stringify(newFS));
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      setQuick(true);
      setQuickQuery('');
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setFindVisible(true);
      setFindQuery('');
      setFindResults([]);
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      editorRef.current?.getAction('editor.action.formatDocument').run();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const files = Object.keys(fs);

  const filtered = quickQuery
    ? files.filter((f) => f.toLowerCase().includes(quickQuery.toLowerCase()))
    : JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');

  const runFind = () => {
    try {
      const regex = new RegExp(findQuery, 'g');
      const results: { path: string; line: number; match: string }[] = [];
      Object.entries(fs).forEach(([p, content]) => {
        content.split('\n').forEach((line, idx) => {
          if (regex.test(line)) {
            results.push({ path: p, line: idx + 1, match: line.trim() });
            regex.lastIndex = 0;
          }
        });
      });
      setFindResults(results);
    } catch (_) {
      setFindResults([]);
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="vscode-editor">
      <div className="flex border-b border-gray-700 bg-gray-800 text-sm items-center">
        {openFiles.map((p, i) => (
          <button
            key={p}
            onClick={() => setActive(i)}
            className={`px-2 py-1 border-r border-gray-700 ${i === active ? 'bg-gray-900' : 'bg-gray-700'}`}
          >
            {p.split('/').pop()}
          </button>
        ))}
        <button
          className="ml-auto px-2 py-1 text-xs hover:bg-gray-700"
          onClick={() => setWrap(wrap === 'on' ? 'off' : 'on')}
        >
          {wrap === 'on' ? 'Disable' : 'Enable'} wrap
        </button>
      </div>
      <div className="flex-1">
        {activePath ? (
          <Editor
            theme={theme}
            language={languageFromPath(activePath)}
            value={activeContent}
            onChange={onChange}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={{ minimap: { enabled: false }, wordWrap: wrap }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">Open a file</div>
        )}
      </div>
      {quick && (
        <div className="absolute inset-0 bg-black/50 flex items-start justify-center pt-20" onClick={() => setQuick(false)}>
          <div className="bg-gray-800 p-4 w-96" onClick={(e) => e.stopPropagation()}>
            <input
              className="w-full mb-2 p-1 text-black"
              autoFocus
              placeholder="Type a file name"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuick(false);
                if (e.key === 'Enter' && filtered[0]) {
                  open(filtered[0]);
                  setQuick(false);
                }
              }}
            />
            <ul className="max-h-60 overflow-auto">
              {filtered.map((f) => (
                <li key={f}>
                  <button
                    className="w-full text-left px-2 py-1 hover:bg-gray-700"
                    onClick={() => {
                      open(f);
                      setQuick(false);
                    }}
                  >
                    {f}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {findVisible && (
        <div className="absolute inset-0 bg-black/50 flex items-start justify-center pt-20" onClick={() => setFindVisible(false)}>
          <div className="bg-gray-800 p-4 w-96 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <input
              className="w-full mb-2 p-1 text-black"
              placeholder="Regex"
              autoFocus
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setFindVisible(false);
                if (e.key === 'Enter') runFind();
              }}
            />
            <ul>
              {findResults.map((r) => (
                <li key={`${r.path}-${r.line}`}>
                  <button
                    className="w-full text-left px-2 py-1 hover:bg-gray-700"
                    onClick={() => {
                      open(r.path);
                      setFindVisible(false);
                      setTimeout(() => editorRef.current?.revealLine(r.line), 0);
                    }}
                  >
                    {`${r.path}:${r.line} ${r.match}`}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
