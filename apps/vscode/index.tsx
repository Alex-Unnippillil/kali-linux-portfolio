'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { openWorkspaceFile, saveWorkspaceFile, WorkspaceFile } from './utils/workspaceFs';

const Monaco = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface OpenFile extends WorkspaceFile {
  dirty: boolean;
}

export default function VsCode() {
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [active, setActive] = useState(0);
  const [mru, setMru] = usePersistentState<string[]>('vscode-mru', []);

  const updateMru = (name: string) => {
    setMru((prev) => [name, ...prev.filter((n) => n !== name)].slice(0, 10));
  };

  const open = async () => {
    const file = await openWorkspaceFile();
    if (!file) return;
    setFiles((fs) => {
      const idx = fs.findIndex((f) => f.name === file.name);
      if (idx !== -1) {
        setActive(idx);
        return fs;
      }
      const newFiles = [...fs, { ...file, dirty: false }];
      setActive(newFiles.length - 1);
      return newFiles;
    });
    updateMru(file.name);
  };

  const save = async () => {
    const file = files[active];
    if (!file) return;
    await saveWorkspaceFile(file.handle, file.content);
    setFiles((fs) => fs.map((f, i) => (i === active ? { ...f, dirty: false } : f)));
    updateMru(file.name);
  };

  const onChange = (value: string | undefined) => {
    const val = value ?? '';
    setFiles((fs) => fs.map((f, i) => (i === active ? { ...f, content: val, dirty: true } : f)));
  };

  const activeFile = files[active];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center space-x-2 p-2 bg-gray-200">
        <button className="px-2 py-1 bg-white rounded" onClick={open}>
          Open
        </button>
        <button
          className="px-2 py-1 bg-white rounded"
          onClick={save}
          disabled={!activeFile || !activeFile.dirty}
        >
          Save
        </button>
      </div>
      <div className="flex space-x-1 bg-gray-100 px-2">
        {files.map((f, i) => (
          <div
            key={i}
            className={`px-2 py-1 cursor-pointer ${i === active ? 'bg-white' : 'bg-gray-300'}`}
            onClick={() => setActive(i)}
          >
            {f.name}{f.dirty ? '*' : ''}
          </div>
        ))}
      </div>
      <div className="flex-1">
        {activeFile && (
          <Monaco
            language="javascript"
            value={activeFile.content}
            onChange={onChange}
            theme="vs-dark"
            height="100%"
          />
        )}
      </div>
      {mru.length > 0 && (
        <div className="p-2 bg-gray-200 text-xs">
          Recent: {mru.join(', ')}
        </div>
      )}
    </div>
  );
}
