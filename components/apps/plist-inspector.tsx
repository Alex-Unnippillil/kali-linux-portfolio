import React, { useState, useMemo } from 'react';
import plist from 'plist';
import bplist from 'bplist-parser';
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
  if (value instanceof Date) {
    return Buffer.from(value.toISOString()).toString('hex');
  }
  if (typeof value === 'string') {
    return Buffer.from(value).toString('hex');
  }
  return Buffer.from(JSON.stringify(value)).toString('hex');
};

const nodeMatches = (value: any, path: string, search: string): boolean => {
  if (!search) return true;
  const lower = search.toLowerCase();
  if (path.toLowerCase().includes(lower)) return true;
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
    if (value === null) return 'null';
    return typeof value === 'object' ? 'dict' : typeof value;
  }, [value]);

  const entries: [string, any][] = useMemo(() => {
    if (Array.isArray(value)) {
      return (value as any[]).map((v, i) => [i.toString(), v]);
    }
    if (value && typeof value === 'object') {
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
        {typeof value !== 'object' && (
          <span className="ml-1">{String(value)}</span>
        )}
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isBinary =
        bytes.length > 6 &&
        bytes[0] === 0x62 &&
        bytes[1] === 0x70 &&
        bytes[2] === 0x6c &&
        bytes[3] === 0x69 &&
        bytes[4] === 0x73 &&
        bytes[5] === 0x74; // "bplist"

      let obj: unknown;
      if (isBinary) {
        try {
          const parsed = bplist.parseBuffer(Buffer.from(bytes));
          obj = parsed.length === 1 ? parsed[0] : parsed;
          setCorruption(null);
        } catch (err: any) {
          setCorruption(Buffer.from(bytes.slice(-32)).toString('hex'));
          throw err;
        }
      } else {
        const text = new TextDecoder().decode(bytes);
        obj = plist.parse(text);
        setCorruption(null);
      }
      setRoot(obj);
      setError('');
      setSelected(null);
    } catch (err: any) {
      setError(err.message || 'Failed to parse plist');
      setRoot(null);
      setSelected(null);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div className="mb-2 flex gap-2">
        <input
          type="file"
          accept=".plist"
          onChange={handleFile}
          className="mb-2"
        />
        {root && (
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-2 text-black rounded"
          />
        )}
      </div>
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
            <div className="text-sm break-all mt-2">
              <strong>Value:</strong> {String(selected.value)}{' '}
              <button
                className="text-blue-300 underline ml-1"
                onClick={() =>
                  navigator.clipboard.writeText(
                    typeof selected.value === 'string'
                      ? selected.value
                      : JSON.stringify(selected.value),
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PlistInspector;

export const displayPlistInspector = () => <PlistInspector />;

