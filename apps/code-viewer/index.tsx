'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import tree from './sample-project.json';

// Dynamically import Monaco and TypeScript language support
const Editor = dynamic(async () => {
  await import('monaco-editor/esm/vs/language/typescript/monaco.contribution');
  const mod = await import('@monaco-editor/react');
  return mod.default;
}, { ssr: false });

type FileNode = {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
};

type FileEntry = { path: string; content: string };

function flatten(node: FileNode, prefix = ''): FileEntry[] {
  if (node.type === 'file') {
    return [{ path: `${prefix}${node.name}`, content: node.content || '' }];
  }
  return (
    node.children?.flatMap((child) => flatten(child, `${prefix}${node.name}/`)) || []
  );
}

const allFiles: FileEntry[] = (tree as FileNode[]).flatMap((n) => flatten(n));

export default function CodeViewer() {
  const [openFiles, setOpenFiles] = useState<FileEntry[]>([]);
  const [active, setActive] = useState(0);

  function open(file: FileEntry) {
    const existing = openFiles.findIndex((f) => f.path === file.path);
    if (existing !== -1) {
      setActive(existing);
    } else {
      setOpenFiles([...openFiles, file]);
      setActive(openFiles.length);
    }
  }

  const activeFile = openFiles[active];

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <aside className="w-64 overflow-auto border-r border-gray-700">
        <ul>
          {allFiles.map((file) => (
            <li key={file.path}>
              <button
                className="w-full px-3 py-1 text-left hover:bg-gray-800"
                onClick={() => open(file)}
              >
                {file.path}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex border-b border-gray-700">
          {openFiles.map((file, i) => (
            <button
              key={file.path}
              onClick={() => setActive(i)}
              className={`px-3 py-1 text-sm border-r border-gray-700 ${
                i === active ? 'bg-gray-900' : 'bg-gray-800'
              }`}
            >
              {file.path.split('/').pop()}
            </button>
          ))}
        </div>
        <div className="flex-1">
          {activeFile ? (
            <Editor
              height="100%"
              defaultLanguage={languageFromPath(activeFile.path)}
              value={activeFile.content}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              Select a file
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function languageFromPath(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  return 'plaintext';
}
