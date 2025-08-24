import React, { useState, useMemo, useEffect, useRef } from 'react';
import YAML from 'js-yaml';
import { stringify as toToml } from '@iarna/toml';
import { UID } from 'bplist-parser';
import { Buffer } from 'buffer';

type TreeNodeProps = {
  value: any;
  path: string;
  search: string;
  onSelect: (path: string, value: any) => void;
};

const hexOf = (value: any) => {
  if (value instanceof Uint8Array || value instanceof Buffer) {
    return Buffer.from(value).toString('hex');
  }
  if (value instanceof UID) {
    return Buffer.from(value.UID.toString()).toString('hex');
  }
  if (value instanceof Date) {
    return Buffer.from(value.toISOString()).toString('hex');
  }
  if (typeof value === 'string') {
    return Buffer.from(value).toString('hex');
  }
  return Buffer.from(JSON.stringify(value)).toString('hex');
};

const decodeHints = (value: any): string[] => {
  const hints: string[] = [];
  if (value instanceof Date) {
    hints.push(`ISO: ${value.toISOString()}`);
    hints.push(`Unix: ${Math.floor(value.getTime() / 1000)}`);
  } else if (value instanceof Uint8Array || value instanceof Buffer) {
    const buf = Buffer.from(value);
    const ascii = buf.toString('utf-8');
    if (/^[\x20-\x7E\r\n\t]*$/.test(ascii)) {
      hints.push(`ASCII: ${ascii}`);
    }
    if (buf.length === 8) {
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const float = view.getFloat64(0, false);
      const date = new Date((float + 978307200) * 1000);
      if (!isNaN(date.getTime())) hints.push(`Date: ${date.toISOString()}`);
    }
  }
  return hints;
};

const nodeMatches = (value: any, path: string, search: string): boolean => {
  if (!search) return true;
  const lower = search.toLowerCase();
  if (path.toLowerCase().includes(lower)) return true;
  if (value instanceof UID) {
    return String(value.UID).toLowerCase().includes(lower);
  }
  if (typeof value !== 'object' || value === null) {
    return String(value).toLowerCase().includes(lower);
  }
  const entries = Array.isArray(value)
    ? (value as any[]).map((v, i) => [i.toString(), v] as [string, any])
    : Object.entries(value);
  return entries.some(([k, v]) =>
    nodeMatches(v, Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`, search),
  );
};

const TypeBadge = ({ type }: { type: string }) => (
  <span className="ml-2 text-xs bg-gray-700 rounded px-1">{type}</span>
);

const TreeNode: React.FC<TreeNodeProps> = ({ value, path, search, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(100);

  const type = useMemo(() => {
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value instanceof Uint8Array || value instanceof Buffer) return 'data';
    if (value instanceof UID) return 'uid';
    if (value === null) return 'null';
    return typeof value === 'object' ? 'dict' : typeof value;
  }, [value]);

  const entries: [string, any][] = useMemo(() => {
    if (Array.isArray(value)) {
      return (value as any[]).map((v, i) => [i.toString(), v]);
    }
    if (value && typeof value === 'object' && !(value instanceof UID)) {
      return Object.entries(value);
    }
    return [];
  }, [value]);

  const filtered = useMemo(
    () =>
      entries
        .map(([k, v]) => {
          const childPath = Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`;
          return { k, v, childPath, matches: nodeMatches(v, childPath, search) };
        })
        .filter(({ matches }) => matches),
    [entries, path, search, value],
  );

  const hasChildren = filtered.length > 0;

  return (
    <div className="ml-2">
      <div
        className="cursor-pointer select-none hover:bg-gray-700 rounded px-1 py-0.5 inline-block"
        onClick={() => {
          onSelect(path, value);
          if (hasChildren) setOpen(!open);
        }}
      >
        {hasChildren && (
          <span className="mr-1">{open ? '\u25BC' : '\u25B6'}</span>
        )}
        <span className="break-all">
          {path === '$' ? 'root' : path.split('.').pop()}
        </span>
        <TypeBadge type={type} />
        {typeof value !== 'object' || value instanceof UID ? (
          <span className="ml-1">{String(value instanceof UID ? value.UID : value)}</span>
        ) : null}
      </div>
      {open && hasChildren && (
        <div className="ml-4 mt-1">
          {filtered.slice(0, limit).map(({ k, v, childPath }) => (
            <TreeNode
              key={childPath}
              value={v}
              path={childPath}
              search={search}
              onSelect={onSelect}
            />
          ))}
          {filtered.length > limit && (
            <button
              className="text-xs text-blue-300 mt-1 underline"
              onClick={() => setLimit(limit + 100)}
            >
              Load more...
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const PlistInspector = () => {
  const [root, setRoot] = useState<any>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ path: string; value: any } | null>(
    null,
  );
  const [corruption, setCorruption] = useState<string | null>(null);
  const [format, setFormat] = useState('');
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('./plist-inspector.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'result') {
        setRoot(e.data.root);
        setError('');
        setSelected(null);
        setCorruption(null);
        setFormat(e.data.format);
        setOffsets(e.data.offsets || {});
      } else if (type === 'error') {
        setError(e.data.error);
        setRoot(null);
        setSelected(null);
        setCorruption(e.data.corruption || null);
        setFormat(e.data.format);
        setOffsets({});
      }
    };
    return () => worker.terminate();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workerRef.current) return;
    const buffer = await file.arrayBuffer();
    workerRef.current.postMessage({ buffer }, [buffer]);
  };

  const normalize = (value: any): any => {
    if (value instanceof UID) return { UID: value.UID };
    if (value instanceof Uint8Array || value instanceof Buffer)
      return Buffer.from(value).toString('base64');
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((v) => normalize(v));
    if (value && typeof value === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
      return out;
    }
    return value;
  };

  const exportJSON = () => {
    if (!root) return;
    const blob = new Blob([JSON.stringify(normalize(root), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plist.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportYAML = () => {
    if (!root) return;
    const blob = new Blob([YAML.dump(normalize(root))], {
      type: 'application/x-yaml',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plist.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTOML = () => {
    if (!root) return;
    const blob = new Blob([toToml(normalize(root))], {
      type: 'application/toml',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plist.toml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div className="mb-2 flex gap-2 flex-wrap items-center">
        <input
          type="file"
          accept=".plist"
          onChange={handleFile}
          className="mb-2"
        />
        {root && (
          <>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-2 text-black rounded"
            />
            <button
              onClick={exportJSON}
              className="bg-gray-700 px-2 py-1 rounded"
            >
              Export JSON
            </button>
            <button
              onClick={exportYAML}
              className="bg-gray-700 px-2 py-1 rounded"
            >
              Export YAML
            </button>
            <button
              onClick={exportTOML}
              className="bg-gray-700 px-2 py-1 rounded"
            >
              Export TOML
            </button>
          </>
        )}
      </div>
      {format && (
        <div className="text-xs text-gray-400 mb-2">Format: {format}</div>
      )}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {corruption && (
        <div className="text-red-400 text-xs mb-2">
          Invalid trailer detected. Last bytes:
          <pre className="whitespace-pre-wrap break-all bg-gray-800 p-2 rounded mt-1">
            {corruption}
          </pre>
        </div>
      )}
      <div className="flex-1 overflow-auto flex">
        {root && (
          <div className="flex-1 overflow-auto">
            <TreeNode
              value={root}
              path="$"
              search={search}
              onSelect={(path, value) => setSelected({ path, value })}
            />
          </div>
        )}
        {selected && (
          <div className="w-1/3 bg-gray-800 p-2 overflow-auto ml-2 rounded">
            <div className="text-sm break-all">
              <strong>Path:</strong> {selected.path}{' '}
              <button
                className="text-blue-300 underline ml-1"
                onClick={() => navigator.clipboard.writeText(selected.path)}
              >
                copy
              </button>
            </div>
            {offsets[selected.path] !== undefined && (
              <div className="text-sm break-all mt-2">
                <strong>Offset:</strong> {offsets[selected.path]}
              </div>
            )}
            <div className="text-sm break-all mt-2">
              <strong>Value:</strong>{' '}
              {String(
                selected.value instanceof UID
                  ? selected.value.UID
                  : selected.value,
              )}{' '}
              <button
                className="text-blue-300 underline ml-1"
                onClick={() =>
                  navigator.clipboard.writeText(
                    typeof selected.value === 'string'
                      ? selected.value
                      : JSON.stringify(normalize(selected.value)),
                  )
                }
              >
                copy
              </button>
            </div>
            <div className="text-sm mt-2">
              <strong>Hex:</strong>
              <pre className="whitespace-pre-wrap break-all bg-gray-900 p-2 rounded mt-1">
                {hexOf(selected.value)}
              </pre>
            </div>
            {(() => {
              const hints = decodeHints(selected.value);
              return (
                hints.length > 0 && (
                  <div className="text-sm mt-2">
                    <strong>Hints:</strong>
                    {hints.map((h, i) => (
                      <div key={i}>{h}</div>
                    ))}
                  </div>
                )
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlistInspector;

export const displayPlistInspector = () => <PlistInspector />;

