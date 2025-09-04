'use client';

import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import useOPFS from '../../hooks/useOPFS.ts';

// Simple VSCode-like editor with in-memory file system and OPFS persistence.
export default function VsCode() {
  const { root, readFile, writeFile, deleteFile, listFiles } = useOPFS();
  const [files, setFiles] = useState([]); // {name, content}
  const [current, setCurrent] = useState(null);
  const [content, setContent] = useState('');

  // Load files from OPFS on mount
  useEffect(() => {
    if (!root) return;
    (async () => {
      const handles = await listFiles();
      const loaded = [];
      for (const h of handles) {
        const text = (await readFile(h.name)) ?? '';
        loaded.push({ name: h.name, content: text });
      }
      setFiles(loaded);
      if (loaded[0]) {
        setCurrent(loaded[0]);
        setContent(loaded[0].content);
      }
    })();
  }, [root, listFiles, readFile]);

  // Autosave current file content to OPFS
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      writeFile(current.name, content);
    }, 500);
    return () => clearTimeout(t);
  }, [content, current, writeFile]);

  const onChange = useCallback(
    (value) => {
      const text = value ?? '';
      setContent(text);
      setFiles((prev) =>
        prev.map((f) => (f.name === current?.name ? { ...f, content: text } : f)),
      );
    },
    [current],
  );

  const addFile = useCallback(() => {
    const name = prompt('File name?');
    if (!name || files.some((f) => f.name === name)) return;
    const file = { name, content: '' };
    setFiles([...files, file]);
    setCurrent(file);
    setContent('');
    writeFile(name, '');
  }, [files, writeFile]);

  const renameFile = useCallback(
    (name) => {
      const file = files.find((f) => f.name === name);
      if (!file) return;
      const newName = prompt('Rename', name);
      if (!newName || newName === name || files.some((f) => f.name === newName)) return;
      setFiles((prev) =>
        prev.map((f) => (f.name === name ? { ...f, name: newName } : f)),
      );
      if (current?.name === name) setCurrent({ ...file, name: newName });
      writeFile(newName, file.content);
      deleteFile(name);
    },
    [files, current, writeFile, deleteFile],
  );

  const removeFile = useCallback(
    (name) => {
      setFiles((prev) => prev.filter((f) => f.name !== name));
      deleteFile(name);
      if (current?.name === name) {
        setCurrent(null);
        setContent('');
      }
    },
    [current, deleteFile],
  );

  const onDragStart = (e, name) => {
    e.dataTransfer.setData('text/plain', name);
  };
  const onDrop = (e, target) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('text/plain');
    if (!source || source === target) return;
    const srcIndex = files.findIndex((f) => f.name === source);
    const tgtIndex = files.findIndex((f) => f.name === target);
    if (srcIndex === -1 || tgtIndex === -1) return;
    const updated = [...files];
    const [moved] = updated.splice(srcIndex, 1);
    updated.splice(tgtIndex, 0, moved);
    setFiles(updated);
  };
  const allowDrop = (e) => e.preventDefault();

  return (
    <div className="flex h-full w-full">
      <aside className="w-48 border-r border-black/20 overflow-auto">
        <button onClick={addFile} className="w-full text-left p-1">
          + New
        </button>
        <ul>
          {files.map((f) => (
            <li
              key={f.name}
              draggable
              onDragStart={(e) => onDragStart(e, f.name)}
              onDragOver={allowDrop}
              onDrop={(e) => onDrop(e, f.name)}
              onClick={() => {
                setCurrent(f);
                setContent(f.content);
              }}
              className={`flex items-center justify-between px-2 py-1 cursor-pointer ${current?.name === f.name ? 'bg-black/20' : ''}`}
            >
              <span className="flex-1 truncate">{f.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    renameFile(f.name);
                  }}
                  aria-label="Rename"
                >
                  R
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.name);
                  }}
                  aria-label="Delete"
                >
                  X
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1">
        {current ? (
          <Editor
            value={content}
            onChange={onChange}
            theme="vs-dark"
            language="javascript"
            options={{ automaticLayout: true }}
          />
        ) : (
          <div className="p-4">Select a file</div>
        )}
      </main>
    </div>
  );
}

export const displayVsCode = () => <VsCode />;
