'use client';

import React, { useRef, useState } from 'react';

interface FileEntry {
  name: string;
  handle: FileSystemFileHandle;
}

export default function VsCode() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const monacoRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const rootRef = useRef<FileSystemDirectoryHandle | null>(null);
  const activeFileRef = useRef<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);

  async function initMonaco() {
    if (monacoRef.current) return;

    const monaco = await import('monaco-editor/esm/vs/editor/editor.api');

    self.MonacoEnvironment = {
      getWorker(_: any, label: string) {
        if (label === 'typescript' || label === 'javascript') {
          return new Worker(
            new URL(
              'monaco-editor/esm/vs/language/typescript/ts.worker?worker',
              import.meta.url,
            ),
          );
        }
        return new Worker(
          new URL('monaco-editor/esm/vs/editor/editor.worker?worker', import.meta.url),
        );
      },
    } as any;

    monacoRef.current = monaco;
    modelRef.current = monaco.editor.createModel('', 'typescript');
    const editor = monaco.editor.create(editorRef.current!, {
      model: modelRef.current,
      theme: 'vs-dark',
      automaticLayout: true,
    });

    modelRef.current.onDidChangeContent(async () => {
      if (!activeFileRef.current) return;
      try {
        const root =
          rootRef.current || (rootRef.current = await (navigator as any).storage.getDirectory());
        const file = await root.getFileHandle(activeFileRef.current, { create: true });
        const writable = await file.createWritable();
        await writable.write(modelRef.current.getValue());
        await writable.close();
      } catch {
        // ignore write errors
      }
    });

    return editor;
  }

  async function openFolder() {
    if (!('showDirectoryPicker' in window)) return;
    const dir = await (window as any).showDirectoryPicker();
    const entries: FileEntry[] = [];
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file') entries.push({ name, handle });
    }
    setFiles(entries);
    await initMonaco();
  }

  async function openFile(file: FileEntry) {
    await initMonaco();
    const data = await file.handle.getFile();
    const text = await data.text();
    activeFileRef.current = file.name;
    modelRef.current?.setValue(text);
  }

  return (
    <div className="flex h-full w-full">
      <div className="w-48 border-r border-gray-700 overflow-auto">
        <button onClick={openFolder} className="w-full p-2 text-left hover:bg-ub-grey">
          Open Folder
        </button>
        <ul>
          {files.map((f) => (
            <li key={f.name}>
              <button
                onClick={() => openFile(f)}
                className="w-full p-1 text-left hover:bg-ub-grey"
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div ref={editorRef} data-testid="monaco-container" className="flex-1" />
    </div>
  );
}

