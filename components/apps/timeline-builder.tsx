import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import { FixedSizeList as List } from 'react-window';

interface TimelineEvent {
  time: string;
  end?: string;
  event: string;
  group?: string;
}

const TimelineBuilder: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [snap, setSnap] = useState<'none' | 'day' | 'week'>('none');
  const listRef = useRef<HTMLDivElement>(null);
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const validateEvent = (e: TimelineEvent) => {
    const start = Date.parse(e.time);
    if (isNaN(start)) return false;
    if (e.end) {
      const end = Date.parse(e.end);
      if (isNaN(end) || start > end) return false;
    }
    return true;
  };

  const snapDate = (date: string) => {
    const d = new Date(date);
    if (snap === 'day') {
      d.setHours(0, 0, 0, 0);
    } else if (snap === 'week') {
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
    }
    return d.toISOString();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const promises = Array.from(files).map(
      (file) =>
        new Promise<TimelineEvent[]>((resolve) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              const rows = results.data as any[];
              const parsed = rows
                .map((r) => ({
                  time: r.time || r.start || r.date || r.timestamp,
                  end: r.end || r.finish,
                  event: r.event || r.title || r.description,
                  group: r.group || r.category,
                }))
                .map((e) => ({
                  ...e,
                  time: snapDate(e.time),
                  end: e.end ? snapDate(e.end) : undefined,
                }))
                .filter((e) => e.time && e.event && validateEvent(e));
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

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timeline.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    if (!listRef.current) return;
    const dataUrl = await toPng(listRef.current);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'timeline.png';
    link.click();
  };

  const onDragStart = (index: number) => (ev: React.DragEvent) => {
    ev.dataTransfer.setData('text/plain', index.toString());
  };

  const onDrop = (index: number) => (ev: React.DragEvent) => {
    const from = Number(ev.dataTransfer.getData('text/plain'));
    if (isNaN(from)) return;
    const updated = [...sortedEvents];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    setEvents(updated);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const e = sortedEvents[index];
    return (
      <li
        style={style}
        key={`${e.time}-${e.event}`}
        draggable
        onDragStart={onDragStart(index)}
        onDragOver={(ev) => ev.preventDefault()}
        onDrop={onDrop(index)}
        tabIndex={0}
        onKeyDown={(ev) => {
          if (ev.key === 'ArrowUp' && index > 0) {
            (listRef.current?.querySelectorAll('li')[index - 1] as HTMLElement)?.focus();
          } else if (ev.key === 'ArrowDown' && index < sortedEvents.length - 1) {
            (listRef.current?.querySelectorAll('li')[index + 1] as HTMLElement)?.focus();
          }
        }}
      >{`${e.time}${e.end ? ` - ${e.end}` : ''}: ${e.event}${e.group ? ` [${e.group}]` : ''}`}</li>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-2 space-y-2">
      <div className="flex space-x-2 items-center">
        <input
          type="file"
          accept=".csv"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        <select
          className="bg-gray-700 px-2 rounded"
          value={snap}
          onChange={(e) => setSnap(e.target.value as 'none' | 'day' | 'week')}
        >
          <option value="none">No Snap</option>
          <option value="day">Snap Day</option>
          <option value="week">Snap Week</option>
        </select>
        <button
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded"
          onClick={exportCsv}
        >
          Export CSV
        </button>
        <button
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded"
          onClick={exportJson}
        >
          Export JSON
        </button>
        <button
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded"
          onClick={exportPng}
        >
          Export PNG
        </button>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-auto bg-white rounded p-2 text-black"
      >
        <List height={400} itemCount={sortedEvents.length} itemSize={24} width="100%">
          {Row}
        </List>
      </div>
    </div>
  );
};

export default TimelineBuilder;

export const displayTimelineBuilder = () => <TimelineBuilder />;

