import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

interface TimelineEvent {
  time: string;
  event: string;
}

const TimelineBuilder: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!events.length) {
      if (diagramRef.current) diagramRef.current.innerHTML = '';
      return;
    }
    const sorted = [...events].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    const lines = ['timeline', '    title Timeline'];
    sorted.forEach((e) => lines.push(`    ${e.time} : ${e.event}`));
    const id = `timeline-${Date.now()}`;
    try {
      mermaid
        .render(id, lines.join('\n'))
        .then(({ svg }) => {
          if (diagramRef.current) diagramRef.current.innerHTML = svg;
        })
        .catch((err) => {
          if (diagramRef.current)
            diagramRef.current.innerHTML = `<pre class="text-red-400">${err}</pre>`;
        });
    } catch (err) {
      if (diagramRef.current)
        diagramRef.current.innerHTML = `<pre class="text-red-400">${err}</pre>`;
    }
  }, [events]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const promises = Array.from(files).map(
      (file) =>
        new Promise<TimelineEvent[]>((resolve) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const rows = results.data as any[];
              const parsed = rows
                .map((r) => ({
                  time: r.time || r.date || r.timestamp,
                  event: r.event || r.title || r.description,
                }))
                .filter((e) => e.time && e.event);
              resolve(parsed);
            },
          });
        })
    );
    Promise.all(promises).then((all) => {
      const merged = [...events, ...all.flat()];
      const unique = Array.from(
        new Map(merged.map((e) => [`${e.time}-${e.event}`, e])).values()
      );
      setEvents(unique);
    });
  };

  const exportCsv = () => {
    const csv = Papa.unparse(events);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timeline.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-2 space-y-2">
      <div className="flex space-x-2">
        <input
          type="file"
          accept=".csv"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded"
          onClick={exportCsv}
        >
          Export CSV
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white rounded" ref={diagramRef} />
    </div>
  );
};

export default TimelineBuilder;

export const displayTimelineBuilder = () => <TimelineBuilder />;

