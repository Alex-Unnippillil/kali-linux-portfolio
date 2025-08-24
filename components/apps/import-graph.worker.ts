import { init, parse } from 'es-module-lexer';

interface GraphNode {
  deps: string[];
  size: number;
  ssrUnsafe: boolean;
}

interface FileError {
  file: string;
  error: string;
}

function resolvePath(from: string, to: string): string {
  if (!to.startsWith('.')) return to;
  const fromParts = from.split('/');
  fromParts.pop();
  const toParts = to.split('/');
  for (const part of toParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') fromParts.pop();
    else fromParts.push(part);
  }
  return fromParts.join('/');
}

function findCycles(graph: Record<string, GraphNode>): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (node: string) => {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      cycles.push([...stack.slice(idx), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const dep of graph[node]?.deps || []) dfs(dep);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };

  Object.keys(graph).forEach((n) => dfs(n));
  return cycles;
}

self.onmessage = async (e: MessageEvent) => {
  const files: Record<string, string> = e.data.files;
  await init;
  const graph: Record<string, GraphNode> = {};
  const errors: FileError[] = [];

  for (const [path, content] of Object.entries(files)) {
    try {
      const [imports] = parse(content);
      const deps = imports.map((i) => resolvePath(path, content.slice(i.s, i.e)));
      const ssrUnsafe = /\b(window|document|navigator|localStorage|sessionStorage)\b/.test(
        content,
      );
      graph[path] = { deps, size: content.length, ssrUnsafe };
      (self as any).postMessage({ type: 'progress', partial: { [path]: graph[path] } });
    } catch (err: any) {
      errors.push({ file: path, error: err.message || String(err) });
    }
  }

  const cycles = findCycles(graph);
  (self as any).postMessage({ type: 'done', graph, errors, cycles });
};
