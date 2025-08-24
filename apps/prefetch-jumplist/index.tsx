import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';

interface TimelineEvent {
  time: number;
  source: string;
  detail: string;
}

const PrefetchJumpList: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (e) => {
      const { events: evts, error: err } = e.data as { events?: TimelineEvent[]; error?: string };
      if (err) {
        setError(`${err}. See docs/forensics-samples.md for sample files.`);
      } else if (evts) {
        setEvents((prev) => [...prev, ...evts]);
      }
    };
    return () => worker.terminate();
  }, []);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError('');
    for (const file of files) {
      const buf = await (file.arrayBuffer?.() || fileToArrayBuffer(file));
      workerRef.current?.postMessage({ id: ++idRef.current, name: file.name, buffer: buf }, [buf]);
    }
  };

  const exportCsv = () => {
    if (events.length === 0) return;
    const sorted = [...events].sort((a, b) => a.time - b.time);
    const rows = sorted.map((ev) => ({
      time: new Date(ev.time).toISOString(),
      source: ev.source,
      detail: ev.detail,
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
          <ul className="space-y-1">
            {sorted.map((ev, i) => (
              <li key={i} className="text-sm">
                {new Date(ev.time).toISOString()} - {ev.source}: {ev.detail}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={exportCsv}
            className="mt-2 px-2 py-1 bg-blue-600 rounded"
            data-testid="export"
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
