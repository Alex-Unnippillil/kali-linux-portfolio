import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';

interface TimelineEvent {
  id: number;
  time: number;
  source: string;
  file: string;
  runCount?: number;
  lnk?: {
    target?: string;
    created?: number;
  };
  selected?: boolean;
}

const PrefetchJumpList: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const fileIdRef = useRef(0);
  const eventIdRef = useRef(0);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (e) => {
      const { events: evts, error: err } = e.data as { events?: Omit<TimelineEvent, 'id' | 'selected'>[]; error?: string };
      if (err) {
        setError(`${err}. See docs/forensics-samples.md for sample files.`);
      } else if (evts) {
        setEvents((prev) => [
          ...prev,
          ...evts.map((ev) => ({ ...ev, id: ++eventIdRef.current, selected: false })),
        ]);
      }
    };
    return () => worker.terminate();
  }, []);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError('');
    for (const file of files) {
      const buf = await (file.arrayBuffer?.() || fileToArrayBuffer(file));
      workerRef.current?.postMessage({ id: ++fileIdRef.current, name: file.name, buffer: buf }, [buf]);
    }
  };

  const toggleSelect = (id: number) => {
    setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, selected: !ev.selected } : ev)));
  };

  const exportCsv = () => {
    const selected = events.filter((ev) => ev.selected);
    if (selected.length === 0) return;
    const rows = selected
      .sort((a, b) => a.time - b.time)
      .map((ev) => ({
        time: new Date(ev.time).toISOString(),
        source: ev.source,
        file: ev.file,
        runCount: ev.runCount ?? '',
        lnkTarget: ev.lnk?.target ?? '',
        lnkCreated: ev.lnk?.created ? new Date(ev.lnk.created).toISOString() : '',
      }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sorted = [...events].sort((a, b) => a.time - b.time);
  const anySelected = events.some((ev) => ev.selected);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-4">
      <input type="file" multiple onChange={onFiles} data-testid="file-input" className="text-sm" />
      {error && (
        <div className="text-red-400" data-testid="error">
          {error}
        </div>
      )}
      {sorted.length > 0 && (
        <div className="flex-1 overflow-auto">
          <table className="text-sm w-full" data-testid="timeline">
            <thead>
              <tr className="text-left">
                <th></th>
                <th>Time</th>
                <th>Source</th>
                <th>File</th>
                <th>Run Count</th>
                <th>LNK Target</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ev) => (
                <tr key={ev.id} className="border-b border-gray-700">
                  <td>
                    <input
                      type="checkbox"
                      checked={ev.selected}
                      onChange={() => toggleSelect(ev.id)}
                    />
                  </td>
                  <td>{new Date(ev.time).toISOString()}</td>
                  <td>{ev.source}</td>
                  <td>{ev.file}</td>
                  <td>{ev.runCount ?? ''}</td>
                  <td>{ev.lnk?.target || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={exportCsv}
            className="mt-2 px-2 py-1 bg-blue-600 rounded"
            data-testid="export"
            disabled={!anySelected}
          >
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
};

export default PrefetchJumpList;

function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
