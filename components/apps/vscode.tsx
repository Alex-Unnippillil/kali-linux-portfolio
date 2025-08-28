import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import files from './vscode-files.json';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type FileEntry = {
  language: string;
  value: string;
  readOnly?: boolean;
};

const VsCode: React.FC = () => {
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState<string>('vs-dark');
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('vscode-theme');
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('vscode-theme', theme);
  }, [theme]);

  const handleEditorDidMount = (_: unknown, monaco: any) => {
    Object.entries(files).forEach(([path, file]) => {
      if (path.endsWith('.d.ts')) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          file.value,
          `ts:${path}`,
        );
      }
    });
  };

  const openFile = (name: string) => {
    if (!openFiles.includes(name)) {
      setOpenFiles([...openFiles, name]);
      setContent(prev => ({ ...prev, [name]: (files as Record<string, FileEntry>)[name].value }));
    }
    setActiveFile(name);
  };

  const closeFile = (name: string) => {
    setOpenFiles(openFiles.filter(f => f !== name));
    setActiveFile(prev => (prev === name ? null : prev));
  };

  const onChange = (value?: string) => {
    if (!activeFile) return;
    setContent(prev => ({ ...prev, [activeFile]: value || '' }));
    const original = (files as Record<string, FileEntry>)[activeFile].value;
    setDirty(prev => ({ ...prev, [activeFile]: value !== original }));
  };

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setPaletteOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 overflow-y-auto border-r border-gray-700 p-2">
          {Object.keys(files).map(name => (
            <div key={name} className="cursor-pointer text-sm" onClick={() => openFile(name)}>
              {name}
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex border-b border-gray-700">
            {openFiles.map(name => (
              <div
                key={name}
                className={`cursor-pointer px-2 py-1 text-sm ${name === activeFile ? 'bg-gray-800' : 'bg-gray-900'}`}
                onClick={() => setActiveFile(name)}
              >
                {name}{dirty[name] ? '*' : ''}
                <button className="ml-1" onClick={(e) => { e.stopPropagation(); closeFile(name); }}>x</button>
              </div>
            ))}
          </div>
          {activeFile && (
            <MonacoEditor
              language={(files as Record<string, FileEntry>)[activeFile].language}
              value={content[activeFile]}
              theme={theme}
              options={{ readOnly: (files as Record<string, FileEntry>)[activeFile].readOnly }}
              onChange={onChange}
              onMount={handleEditorDidMount}
            />
          )}
        </div>
      </div>
      <div className="border-t border-gray-700 p-2">
        <select
          value={theme}
          onChange={e => setTheme(e.target.value)}
          className="rounded bg-gray-900 p-1 text-sm text-white"
        >
          <option value="vs-dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      {paletteOpen && (
        <div className="absolute inset-0 flex items-start justify-center bg-black/50" onClick={() => setPaletteOpen(false)}>
          <div className="mt-20 w-64 bg-gray-800 p-4" onClick={e => e.stopPropagation()}>
            <div className="text-white">Action Palette (Ctrl+K)</div>
            <button
              className="mt-2 w-full bg-gray-700 p-1 text-white"
              onClick={() => {
                setTheme(t => (t === 'vs-dark' ? 'light' : 'vs-dark'));
                setPaletteOpen(false);
              }}
            >
              Toggle Theme
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VsCode;
export const displayVsCode = () => <VsCode />;

