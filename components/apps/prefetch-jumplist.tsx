import React, { useState } from 'react';

interface ParsedResult {
  path: string;
  runCount: number | string;
  lastRun: string;
}

let wasmParser: any | null = null;

async function loadWasm() {
  if (wasmParser !== null) return wasmParser;
  try {
    const resp = await fetch('/wasm/prefetch_jumplist.wasm');
    const bytes = await resp.arrayBuffer();
    const mod = await WebAssembly.instantiate(bytes, {});
    wasmParser = mod.instance.exports as any;
  } catch (e) {
    wasmParser = null;
  }
  return wasmParser;
}

function extractPath(buffer: ArrayBuffer): string {
  try {
    const text = new TextDecoder('utf-16le').decode(buffer);
    const match = text.match(/[A-Z]:\\\\[^\0]+/);
    return match ? match[0] : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function parsePrefetch(buffer: ArrayBuffer): ParsedResult {
  const view = new DataView(buffer);
  let runCount: number | string = 'Unknown';
  let lastRun = 'Unknown';
  try {
    runCount = view.getUint32(0x90, true);
    const low = view.getUint32(0x80, true);
    const high = view.getUint32(0x84, true);
    const ts = (BigInt(high) << 32n) | BigInt(low);
    if (ts !== 0n) {
      const ms = Number(ts / 10000n - 11644473600000n);
      lastRun = new Date(ms).toISOString();
    }
  } catch {
    /* ignore */
  }
  return { path: extractPath(buffer), runCount, lastRun };
}

function parseJumpList(buffer: ArrayBuffer): ParsedResult {
  return { path: extractPath(buffer), runCount: 'Unknown', lastRun: 'Unknown' };
}

async function parseFile(name: string, buffer: ArrayBuffer): Promise<ParsedResult> {
  try {
    const wasm = await loadWasm();
    if (wasm && typeof wasm.parse === 'function') {
      const result = wasm.parse(new Uint8Array(buffer), name);
      return {
        path: result.path || 'Unknown',
        runCount: result.run_count ?? 'Unknown',
        lastRun: result.last_run ? new Date(result.last_run).toISOString() : 'Unknown',
      };
    }
  } catch {
    // fallback below
  }
  if (name.toLowerCase().endsWith('.pf')) {
    return parsePrefetch(buffer);
  }
  return parseJumpList(buffer);
}

const PrefetchJumplistApp: React.FC = () => {
  const [results, setResults] = useState<ParsedResult & { name: string }[]>([]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const parsed: (ParsedResult & { name: string })[] = [];
    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        const res = await parseFile(file.name, buf);
        parsed.push({ name: file.name, ...res });
      } catch {
        parsed.push({ name: file.name, path: 'Unknown', runCount: 'Unknown', lastRun: 'Unknown' });
      }
    }
    setResults(parsed);
  };

  return (
    <div className="h-full w-full p-4 overflow-auto bg-panel text-white">
      <input type="file" multiple onChange={handleFiles} className="mb-4" />
      {results.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-4">File</th>
              <th className="pr-4">Path Hint</th>
              <th className="pr-4">Run Count</th>
              <th>Last Run</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.name} className="border-t border-gray-700">
                <td className="pr-4">{r.name}</td>
                <td className="pr-4 break-all">{r.path}</td>
                <td className="pr-4">{r.runCount}</td>
                <td>{r.lastRun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PrefetchJumplistApp;

export const displayPrefetchJumplist = () => <PrefetchJumplistApp />;
