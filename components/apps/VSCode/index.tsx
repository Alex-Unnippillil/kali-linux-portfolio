import { useEffect, useState } from 'react';
import Editor from './Editor';

interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
}

function loadSamplePaths(): string[] {
  // Browser build using webpack context
  if (typeof window !== 'undefined' && (require as any).context) {
    try {
      const req = (require as any).context('../../../public/samples', true, /.+/);
      return req.keys().map((k: string) => k.replace('./', ''));
    } catch {
      return [];
    }
  }
  // Node/test environment
  try {
    const fs = eval('require')('fs');
    const path = eval('require')('path');
    const base = path.join(process.cwd(), 'public', 'samples');
    if (!fs.existsSync(base)) return [];
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: any) => {
        const res = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(res) : [res];
      });
    return walk(base).map((p) => p.replace(base + path.sep, ''));
  } catch {
    return [];
  }
}

const samplePaths = loadSamplePaths();

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of paths) {
    const parts = file.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let node = current.find((n) => n.name === part);
      if (!node) {
        node = { name: part };
        if (i === parts.length - 1) {
          node.path = file;
        } else {
          node.children = [];
        }
        current.push(node);
      }
      if (node.children) {
        current = node.children;
      }
    }
  }
  return root;
}

const fileTree = buildTree(samplePaths);

export default function VSCode() {
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  async function openFile(path: string) {
    const existing = openFiles.find((f) => f.path === path);
    if (existing) {
      setActive(path);
      return;
    }
    const res = await fetch(`/samples/${path}`);
    const text = await res.text();
    setOpenFiles([...openFiles, { path, content: text }]);
    setActive(path);
  }

  return (
    <div className="flex h-full w-full">
      <aside className="w-48 overflow-auto border-r border-gray-300 dark:border-gray-700 text-xs">
        <FileTree nodes={fileTree} onOpen={openFile} />
      </aside>
      <section className="flex-1 flex flex-col">
        <div className="flex space-x-2 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800" role="tablist">
          {openFiles.map((file) => (
            <button role="tab"
              key={file.path}
              className={`px-2 py-1 ${active === file.path ? 'bg-white dark:bg-gray-900' : ''}`}
              onClick={() => setActive(file.path)}
            >
              {file.path.split('/').pop()}
            </button>
          ))}
        </div>
        <div className="flex-1">
          {active && (
            <Editor
              key={active}
              path={active}
              content={openFiles.find((f) => f.path === active)?.content || ''}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function FileTree({ nodes, onOpen }: { nodes: TreeNode[]; onOpen: (path: string) => void }) {
  return (
    <ul className="pl-2">
      {nodes.map((node) => (
        <li key={node.name} className="my-1">
          {node.children ? (
            <details open>
              <summary>{node.name}</summary>
              <FileTree nodes={node.children} onOpen={onOpen} />
            </details>
          ) : (
            <button className="hover:underline" onClick={() => node.path && onOpen(node.path)}>
              {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
