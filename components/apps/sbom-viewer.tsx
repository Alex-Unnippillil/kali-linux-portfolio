import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import Papa from 'papaparse';
import { FixedSizeList as List } from 'react-window';
import { ParsedSbom, fetchOsv } from '@lib/sbom';


interface TreeProps {
  id: string;
  graph: Record<string, string[]>;
}

const DependencyTree: React.FC<TreeProps> = ({ id, graph }) => {
  const deps = graph[id] || [];
  if (!deps.length) return null;
  return (
    <ul className="ml-4 list-disc">
      {deps.map((d) => (
        <li key={d}>
          {d}
          <DependencyTree id={d} graph={graph} />
        </li>
      ))}
    </ul>
  );
};

const SbomViewer: React.FC = () => {
  const [sbom, setSbom] = useState<ParsedSbom | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const w = new Worker(new URL('./sbom-parser.worker.ts', import.meta.url), {
      type: 'module',
    });
    w.onmessage = (e) => {

      const { type } = e.data;
      if (type === 'progress') {
        setProgress(e.data.progress);
      } else if (type === 'done') {
        const parsed: ParsedSbom = e.data.sbom;
        Promise.all(parsed.components.map(fetchOsv)).then(() => {
          setSbom(parsed);
          setIsParsing(false);
        });
      } else if (type === 'error') {
        setError(e.data.error);
        setIsParsing(false);
      } else if (type === 'cancelled') {
        setIsParsing(false);
      }
    };
    setWorker(w);
    return () => w.terminate();

  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!worker) return;
      setProgress(0);
      setError('');
      setSbom(null);
      setIsParsing(true);
      worker.postMessage({ type: 'parse', file });
    },
    [worker]
  );

  const cancel = useCallback(() => {
    worker?.postMessage({ type: 'cancel' });
  }, [worker]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const components = sbom?.components || [];

  const fuse = useMemo(
    () => new Fuse(components, { keys: ['name'], threshold: 0.3 }),
    [components]
  );

  const filtered = useMemo(() => {
    if (!query) return components;
    return fuse.search(query).map((r) => r.item);
  }, [components, query, fuse]);

  const licenseMap = useMemo(() => {
    const map: Record<string, number> = {};
    components.forEach((c) =>
      c.licenses.forEach((l) => {
        map[l] = (map[l] || 0) + 1;
      })
    );
    return map;
  }, [components]);

  const exportCsv = () => {
    if (!sbom) return;
    const rows = components.map((c) => ({
      name: c.name,
      version: c.version || '',
      licenses: c.licenses.join(';'),
      vulnerabilities: c.vulns.map((v) => v.id).join(';'),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sbom.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const c = filtered[index];
    return (
      <div
        style={style}
        className="flex gap-2 px-2 py-1 border-b cursor-pointer"
        onClick={() => setSelected(c.id)}
      >
        <div className="flex-1 truncate" title={c.name}>
          {c.name}
        </div>
        <div className="w-24">{c.version}</div>
        <div className="flex-1 truncate" title={c.licenses.join(', ')}>
          {c.licenses.join(', ')}
        </div>
        <div className="flex-1 truncate">
          {c.vulns.map((v) => {
            const url = v.id.startsWith('CVE-')
              ? `https://nvd.nist.gov/vuln/detail/${v.id}`
              : `https://osv.dev/vulnerability/${v.id}`;
            return (
              <a
                key={v.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-300 underline mr-1"
              >
                {v.id}
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  if (!sbom) {
    if (isParsing) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed">
          <div className="mb-2">Parsing... {Math.round(progress * 100)}%</div>
          <button onClick={cancel} className="px-2 py-1 bg-red-600 text-white">
            Cancel
          </button>
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>
      );
    }
    return (
      <div
        className="h-full w-full flex items-center justify-center border-2 border-dashed"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <label className="text-center">
          Drop SBOM JSON here or{' '}
          <input
            data-testid="file-input"
            type="file"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </label>
        {error && <div className="text-red-500 mt-2">{error}</div>}

      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full w-full overflow-hidden text-white bg-ub-cool-grey">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="border p-1 text-black"
        />
        <button onClick={exportCsv} className="border px-2 text-black">
          Export CSV
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden gap-4">
        <div className="w-1/2 border overflow-hidden">
          <List
            height={400}
            width={400}
            itemCount={filtered.length}
            itemSize={35}
          >
            {Row}
          </List>
        </div>
        <div className="w-1/2 overflow-auto text-sm space-y-4">
          {selected && (
            <div>
              <h3 className="font-bold mb-1">Dependency Tree</h3>
              <div>{selected}</div>
              <DependencyTree id={selected} graph={sbom.graph} />
            </div>
          )}
          <div>
            <h3 className="font-bold mb-1">License Map</h3>
            <ul className="ml-4 list-disc">
              {Object.entries(licenseMap).map(([lic, count]) => (
                <li key={lic}>
                  {lic}: {count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SbomViewer;
