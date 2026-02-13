import React, { useCallback, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface SymbolRecord {
  address: string;
  name: string;
  section?: string;
  type?: string;
  size?: number;
  source?: 'current' | 'pdb' | 'elf';
}

type DiffStatus = 'identical' | 'conflict' | 'new' | 'missing';
type DiffAction = 'keep' | 'import' | 'skip' | 'remove';

const HISTORY_STORAGE_KEY = 'ghidra-symbol-history';
const HISTORY_LIMIT = 10;

const SAMPLE_PDB_MAP = `0001:00001000       start                 00401000 f   .text    00000020
0001:00001020       authenticate_user     00401020 f   .text    00000030
0001:00001060       log_event             00401060 f   .text    00000018`;

const SAMPLE_ELF_MAP = `0000000000401000 00000020 FUNC GLOBAL .text start
0000000000401020 00000034 FUNC GLOBAL .text authenticate_user
0000000000401060 00000018 FUNC GLOBAL .text log_event`;

const STATUS_ACTIONS: Record<DiffStatus, DiffAction[]> = {
  identical: ['keep'],
  conflict: ['keep', 'import'],
  new: ['import', 'skip'],
  missing: ['keep', 'remove'],
};

function isSymbolRecord(value: unknown): value is SymbolRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as SymbolRecord;
  return typeof record.address === 'string' && typeof record.name === 'string';
}

function isSymbolSnapshot(value: unknown): value is SymbolRecord[] {
  return Array.isArray(value) && value.every(isSymbolRecord);
}

function isHistory(value: unknown): value is SymbolRecord[][] {
  return Array.isArray(value) && value.every(isSymbolSnapshot);
}

function normalizeAddress(raw: string): string {
  if (!raw) return '0x00000000';
  const trimmed = raw.trim();
  const noPrefix =
    trimmed.startsWith('0x') || trimmed.startsWith('0X')
      ? trimmed.slice(2)
      : trimmed;
  const sanitized = noPrefix.replace(/[^0-9a-fA-F]/g, '');
  const normalized = sanitized || '0';
  try {
    const value = BigInt(`0x${normalized}`);
    const hex = value.toString(16).toUpperCase();
    const width = Math.max(8, hex.length);
    return `0x${hex.padStart(width, '0')}`;
  } catch {
    return `0x${normalized.toUpperCase().padStart(8, '0')}`;
  }
}

function pdbTypeToLabel(token: string): string {
  if (!token) return 'Symbol';
  switch (token.toLowerCase()) {
    case 'f':
      return 'Function';
    case 'o':
      return 'Object';
    default:
      return 'Symbol';
  }
}

function elfTypeToLabel(token: string): string {
  if (!token) return 'Symbol';
  switch (token.toUpperCase()) {
    case 'FUNC':
      return 'Function';
    case 'OBJECT':
      return 'Object';
    default:
      return token;
  }
}

function parseSize(token: string, fallbackBase = 16): number | undefined {
  if (!token) return undefined;
  const sanitized = token.trim();
  if (!sanitized) return undefined;
  const cleaned = sanitized.replace(/[^0-9a-fA-F]/g, '');
  if (!cleaned) return undefined;
  const base =
    sanitized.startsWith('0x') ||
    sanitized.startsWith('0X') ||
    /[a-fA-F]/.test(cleaned) ||
    (fallbackBase === 10 && cleaned.length > 4 && cleaned.startsWith('0'))
      ? 16
      : fallbackBase;
  const parsed = parseInt(cleaned, base);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parsePdbMap(input: string): SymbolRecord[] {
  const lines = input.split(/\r?\n/);
  const records: SymbolRecord[] = [];
  const regex = /^(?:;.*)?\s*([0-9A-Fa-f]{4}):([0-9A-Fa-f]{8})\s+([^\s]+)\s+([0-9A-Fa-f]{8})\s+([A-Za-z])\s+(\.[\w.]+)\s+([0-9A-Fa-f]{8})/;
  lines.forEach((line) => {
    const match = line.match(regex);
    if (!match) return;
    const [, seg, offset, name, addr, type, section, sizeHex] = match;
    const address = normalizeAddress(addr || `${seg}${offset}`);
    records.push({
      address,
      name,
      section,
      type: pdbTypeToLabel(type),
      size: parseSize(sizeHex, 16),
      source: 'pdb',
    });
  });
  return records.sort((a, b) => a.address.localeCompare(b.address));
}

export function parseElfMap(input: string): SymbolRecord[] {
  const lines = input.split(/\r?\n/);
  const records: SymbolRecord[] = [];
  const regex = /^(?:;.*)?\s*([0-9A-Fa-f]{8,16})\s+([0-9A-Fa-f]{1,16})\s+(\w+)\s+\w+\s+(\.[\w.]+)\s+([^\s]+)/;
  lines.forEach((line) => {
    const match = line.match(regex);
    if (!match) return;
    const [, addr, sizeToken, typeToken, section, name] = match;
    const address = normalizeAddress(addr);
    records.push({
      address,
      name,
      section,
      type: elfTypeToLabel(typeToken),
      size: parseSize(sizeToken, 10),
      source: 'elf',
    });
  });
  return records.sort((a, b) => a.address.localeCompare(b.address));
}

interface DiffRow {
  address: string;
  current?: SymbolRecord;
  incoming?: SymbolRecord;
  status: DiffStatus;
  action: DiffAction;
}

function areSymbolsEqual(a?: SymbolRecord, b?: SymbolRecord) {
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.section === b.section &&
    a.type === b.type &&
    (a.size ?? 0) === (b.size ?? 0)
  );
}

function defaultActionForStatus(status: DiffStatus): DiffAction {
  switch (status) {
    case 'conflict':
    case 'new':
      return 'import';
    case 'missing':
    case 'identical':
    default:
      return 'keep';
  }
}

function isActionValid(status: DiffStatus, action: DiffAction) {
  return STATUS_ACTIONS[status]?.includes(action) ?? false;
}

function computeDiffs(
  currentSymbols: SymbolRecord[],
  importedSymbols: SymbolRecord[],
  overrides: Record<string, DiffAction>,
): DiffRow[] {
  const currentMap = new Map<string, SymbolRecord>();
  currentSymbols.forEach((sym) => {
    currentMap.set(normalizeAddress(sym.address), { ...sym, address: normalizeAddress(sym.address) });
  });

  const importMap = new Map<string, SymbolRecord>();
  importedSymbols.forEach((sym) => {
    importMap.set(normalizeAddress(sym.address), { ...sym, address: normalizeAddress(sym.address) });
  });

  const addresses = Array.from(new Set([...currentMap.keys(), ...importMap.keys()])).sort();

  return addresses.map((address) => {
    const current = currentMap.get(address);
    const incoming = importMap.get(address);
    let status: DiffStatus = 'identical';
    if (current && incoming) {
      status = areSymbolsEqual(current, incoming) ? 'identical' : 'conflict';
    } else if (incoming && !current) {
      status = 'new';
    } else if (current && !incoming) {
      status = 'missing';
    }

    const stored = overrides[address];
    const action = stored && isActionValid(status, stored)
      ? stored
      : defaultActionForStatus(status);

    return {
      address,
      current,
      incoming,
      status,
      action,
    };
  });
}

interface SymbolImportProps {
  currentSymbols: SymbolRecord[];
  onMerge(next: SymbolRecord[]): void;
}

function cloneSnapshot(snapshot: SymbolRecord[]): SymbolRecord[] {
  return snapshot.map((sym) => ({ ...sym }));
}

function formatSize(size?: number) {
  if (typeof size !== 'number' || Number.isNaN(size)) return '—';
  return `0x${size.toString(16).toUpperCase()} (${size} bytes)`;
}

const SymbolImport: React.FC<SymbolImportProps> = ({ currentSymbols, onMerge }) => {
  const [mode, setMode] = useState<'pdb' | 'elf'>('pdb');
  const [rawInput, setRawInput] = useState('');
  const [importedSymbols, setImportedSymbols] = useState<SymbolRecord[]>([]);
  const [actions, setActions] = useState<Record<string, DiffAction>>({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = usePersistentState<SymbolRecord[][]>(
    HISTORY_STORAGE_KEY,
    () => [],
    isHistory,
  );

  const diffRows = useMemo(
    () => computeDiffs(currentSymbols, importedSymbols, actions),
    [currentSymbols, importedSymbols, actions],
  );

  const pendingChanges = useMemo(
    () =>
      diffRows.some((row) => {
        switch (row.status) {
          case 'conflict':
            return row.action === 'import';
          case 'new':
            return row.action === 'import';
          case 'missing':
            return row.action === 'remove';
          default:
            return false;
        }
      }),
    [diffRows],
  );

  const loadSample = useCallback(
    (type: 'pdb' | 'elf') => {
      const sample = type === 'pdb' ? SAMPLE_PDB_MAP : SAMPLE_ELF_MAP;
      setMode(type);
      setRawInput(sample);
      setImportedSymbols(type === 'pdb' ? parsePdbMap(sample) : parseElfMap(sample));
      setActions({});
      setStatus(
        type === 'pdb'
          ? 'Loaded sample PDB symbol map. Review differences before applying.'
          : 'Loaded sample ELF symbol map. Review differences before applying.',
      );
      setError(null);
    },
    [],
  );

  const handleParse = useCallback(() => {
    const parser = mode === 'pdb' ? parsePdbMap : parseElfMap;
    const parsed = parser(rawInput);
    setImportedSymbols(parsed);
    setActions({});
    if (!parsed.length) {
      setError('No symbols were parsed. Check the format and try again.');
    } else {
      setError(null);
      setStatus(`Parsed ${parsed.length} symbol${parsed.length === 1 ? '' : 's'} from input.`);
    }
  }, [mode, rawInput]);

  const updateAction = useCallback(
    (address: string, nextAction: DiffAction) => {
      const target = diffRows.find((row) => row.address === address);
      if (!target || !isActionValid(target.status, nextAction)) return;
      setActions((prev) => {
        if (prev[address] === nextAction) return prev;
        return { ...prev, [address]: nextAction };
      });
    },
    [diffRows],
  );

  const applyMerge = useCallback(() => {
    const changedRows = diffRows.filter((row) => {
      switch (row.status) {
        case 'conflict':
          return row.action === 'import';
        case 'new':
          return row.action === 'import';
        case 'missing':
          return row.action === 'remove';
        default:
          return false;
      }
    });

    if (!changedRows.length) {
      setStatus('No symbol updates selected. Nothing to merge.');
      return;
    }

    const snapshot = cloneSnapshot(currentSymbols);
    setHistory((prev) => {
      const next = [snapshot, ...prev];
      return next.slice(0, HISTORY_LIMIT);
    });

    const nextMap = new Map<string, SymbolRecord>();
    currentSymbols.forEach((sym) => {
      const address = normalizeAddress(sym.address);
      nextMap.set(address, { ...sym, address });
    });

    diffRows.forEach((row) => {
      const key = row.address;
      switch (row.status) {
        case 'conflict':
          if (row.action === 'import' && row.incoming) {
            nextMap.set(key, { ...row.incoming, address: key, source: 'current' });
          }
          break;
        case 'new':
          if (row.action === 'import' && row.incoming) {
            nextMap.set(key, { ...row.incoming, address: key, source: 'current' });
          }
          break;
        case 'missing':
          if (row.action === 'remove') {
            nextMap.delete(key);
          }
          break;
        case 'identical':
        default:
          break;
      }
    });

    const merged = Array.from(nextMap.values()).sort((a, b) => a.address.localeCompare(b.address));
    onMerge(merged);
    setStatus(`Applied ${changedRows.length} symbol update${changedRows.length === 1 ? '' : 's'}.`);
  }, [currentSymbols, diffRows, onMerge, setHistory]);

  const undoMerge = useCallback(() => {
    if (!history.length) {
      setStatus('Nothing to undo.');
      return;
    }
    const [latest, ...rest] = history;
    onMerge(cloneSnapshot(latest));
    setHistory(rest);
    setStatus('Restored previous symbol snapshot from history.');
  }, [history, onMerge, setHistory]);

  const historyLength = history?.length ?? 0;

  return (
    <div className="text-xs md:text-sm space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => loadSample('pdb')}
          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded"
        >
          Load sample PDB map
        </button>
        <button
          type="button"
          onClick={() => loadSample('elf')}
          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded"
        >
          Load sample ELF map
        </button>
        <div className="flex items-center gap-2">
          <label htmlFor="symbol-import-mode" className="font-semibold">
            Parser
          </label>
          <select
            id="symbol-import-mode"
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'pdb' | 'elf')}
          >
            <option value="pdb">PDB map</option>
            <option value="elf">ELF map</option>
          </select>
        </div>
      </div>
      <label htmlFor="symbol-import-input" className="block font-semibold">
        Symbol map input
      </label>
      <textarea
        id="symbol-import-input"
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder="Paste symbol map output here"
        aria-label="Symbol map input"
        className="w-full h-32 md:h-40 bg-gray-800 border border-gray-700 rounded p-2 font-mono"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={handleParse}
          className="px-2 py-1 bg-blue-700 hover:bg-blue-600 transition rounded text-white"
        >
          Parse symbols
        </button>
        <button
          type="button"
          onClick={applyMerge}
          className="px-2 py-1 bg-green-700 hover:bg-green-600 transition rounded text-white disabled:opacity-50"
          disabled={!pendingChanges}
        >
          Apply merge
        </button>
        <button
          type="button"
          onClick={undoMerge}
          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 transition rounded text-black disabled:opacity-50"
          disabled={historyLength === 0}
        >
          Undo last merge
        </button>
        <span className="text-gray-400">
          Current symbols: {currentSymbols.length} • Imported: {importedSymbols.length}
        </span>
      </div>
      {status && <div className="text-green-400" role="status">{status}</div>}
      {error && <div className="text-red-400" role="alert">{error}</div>}
      <div className="overflow-auto max-h-80 border border-gray-700 rounded">
        <table className="w-full border-collapse">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-left px-2 py-1">Address</th>
              <th className="text-left px-2 py-1">Current</th>
              <th className="text-left px-2 py-1">Imported</th>
              <th className="text-left px-2 py-1">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {diffRows.map((row) => (
              <tr key={row.address} className="border-t border-gray-700 align-top">
                <td className="px-2 py-1 font-mono whitespace-nowrap">{row.address}</td>
                <td className="px-2 py-1">
                  {row.current ? (
                    <div>
                      <div className="font-semibold">{row.current.name}</div>
                      <div className="text-gray-400">{row.current.section || '—'} • {row.current.type || 'Symbol'}</div>
                      <div className="text-gray-500">{formatSize(row.current.size)}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-2 py-1">
                  {row.incoming ? (
                    <div>
                      <div className="font-semibold">{row.incoming.name}</div>
                      <div className="text-gray-400">{row.incoming.section || '—'} • {row.incoming.type || 'Symbol'}</div>
                      <div className="text-gray-500">{formatSize(row.incoming.size)}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-2 py-1">
                  <div className="flex flex-wrap gap-1">
                    {row.status === 'conflict' && (
                      <>
                        <button
                          type="button"
                          aria-pressed={row.action === 'keep'}
                          onClick={() => updateAction(row.address, 'keep')}
                          className={`px-2 py-1 rounded border ${
                            row.action === 'keep' ? 'bg-gray-700 border-gray-500' : 'bg-gray-900 border-gray-700'
                          }`}
                        >
                          Keep current
                        </button>
                        <button
                          type="button"
                          aria-pressed={row.action === 'import'}
                          onClick={() => updateAction(row.address, 'import')}
                          className={`px-2 py-1 rounded border ${
                            row.action === 'import' ? 'bg-green-700 border-green-500' : 'bg-gray-900 border-gray-700'
                          }`}
                        >
                          Use import
                        </button>
                      </>
                    )}
                    {row.status === 'new' && (
                      <>
                        <button
                          type="button"
                          aria-pressed={row.action === 'import'}
                          onClick={() => updateAction(row.address, 'import')}
                          className={`px-2 py-1 rounded border ${
                            row.action === 'import' ? 'bg-green-700 border-green-500' : 'bg-gray-900 border-gray-700'
                          }`}
                        >
                          Add symbol
                        </button>
                        <button
                          type="button"
                          aria-pressed={row.action === 'skip'}
                          onClick={() => updateAction(row.address, 'skip')}
                          className={`px-2 py-1 rounded border ${
                            row.action === 'skip' ? 'bg-gray-700 border-gray-500' : 'bg-gray-900 border-gray-700'
                          }`}
                        >
                          Skip addition
                        </button>
                      </>
                    )}
                    {row.status === 'missing' && (
                      <>
                        <button
                          type="button"
                          aria-pressed={row.action === 'keep'}
                          onClick={() => updateAction(row.address, 'keep')}
                          className={`px-2 py-1 rounded border ${
                            row.action === 'keep' ? 'bg-gray-700 border-gray-500' : 'bg-gray-900 border-gray-700'
                          }`}
                        >
                          Keep symbol
                        </button>
                        <button
                          type="button"
                          aria-pressed={row.action === 'remove'}
                          onClick={() => updateAction(row.address, 'remove')}
                          className={`px-2 py-1 rounded border ${
                            row.action === 'remove' ? 'bg-red-700 border-red-500' : 'bg-gray-900 border-gray-700'
                          }`}
                        >
                          Remove symbol
                        </button>
                      </>
                    )}
                    {row.status === 'identical' && <span className="text-gray-500">No changes</span>}
                  </div>
                </td>
              </tr>
            ))}
            {diffRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-gray-500">
                  Load a symbol map to review differences.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-gray-400">
        Conflicts: {diffRows.filter((row) => row.status === 'conflict').length} • New:{' '}
        {diffRows.filter((row) => row.status === 'new').length} • Missing:{' '}
        {diffRows.filter((row) => row.status === 'missing').length}
      </div>
    </div>
  );
};

export default SymbolImport;
