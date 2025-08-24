import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import ReactMarkdown from 'react-markdown';

interface TimelineEvent {
  time: string;
  end?: string;
  event: string;
  group?: string;
  link?: string;
}

interface Props {
  openApp?: (id: string) => void;
}

const TimelineBuilder: React.FC<Props> = ({ openApp }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [snap, setSnap] = useState<'none' | 'day' | 'week'>('none');
  const listRef = useRef<HTMLDivElement>(null);

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

  const sortEvents = (evts: TimelineEvent[]) =>
    evts.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

  const parseCsv = (file: File): Promise<TimelineEvent[]> =>
    new Promise((resolve) => {
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
              link: r.link || r.evidence || r.url,
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
    });

  const parseJson = (file: File): Promise<TimelineEvent[]> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const arr = Array.isArray(data) ? data : data.events || [];
          const parsed = arr
            .map((r: any) => ({
              time: r.time || r.start || r.date || r.timestamp,
              end: r.end || r.finish,
              event: r.event || r.title || r.description,
              group: r.group || r.category,
              link: r.link || r.evidence || r.url,
            }))
            .map((e: any) => ({
              ...e,
              time: snapDate(e.time),
              end: e.end ? snapDate(e.end) : undefined,
            }))
            .filter((e: TimelineEvent) => e.time && e.event && validateEvent(e));
          resolve(parsed);
        } catch {
          resolve([]);
        }
      };
      reader.readAsText(file);
    });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const promises = Array.from(files).map((file) =>
      file.name.toLowerCase().endsWith('.json') ? parseJson(file) : parseCsv(file)
    );
    Promise.all(promises).then((all) => {
      const merged = [...events, ...all.flat()];
      const unique = Array.from(
        new Map(merged.map((e) => [`${e.time}-${e.event}`, e])).values()
      );
      setEvents(sortEvents(unique));
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

  const exportPdf = async () => {
    if (!listRef.current) return;
    const dataUrl = await toPng(listRef.current);
    const width = listRef.current.clientWidth;
    const height = listRef.current.clientHeight;
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    pdf.save('timeline.pdf');
  };
  const onDragStart = (index: number) => (ev: React.DragEvent) => {
    ev.dataTransfer.setData('text/plain', index.toString());
  };

  const onDrop = (index: number) => (ev: React.DragEvent) => {
    const from = Number(ev.dataTransfer.getData('text/plain'));
    if (isNaN(from)) return;
    const updated = [...events];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    setEvents(updated);
  };

  const handleLinkClick = (e: React.MouseEvent, link: string) => {
    e.preventDefault();
    if (link.startsWith('app:')) {
      const appId = link.replace('app:', '');
      openApp?.(appId);
    } else {
      window.open(link, '_blank');
    }
  };

  const grouped = () => {
    const order: string[] = [];
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach((evt) => {
      const g = evt.group || 'Ungrouped';
      if (!groups[g]) {
        groups[g] = [];
        order.push(g);
      }
      groups[g].push(evt);
    });
    return { order, groups };
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-2 space-y-2">
      <div className="flex space-x-2 items-center">
        <input
          type="file"
          accept=".csv,.json"
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
        <button
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded"
          onClick={exportPdf}
        >
          Export PDF
        </button>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-auto bg-white rounded p-2 text-black"
        onDragOver={(e) => e.preventDefault()}
      >
        <ul className="space-y-1">
          {(() => {
            const { order, groups } = grouped();
            const items: React.ReactNode[] = [];
            order.forEach((g) => {
              items.push(
                <li key={`group-${g}`} className="font-bold mt-2">
                  {g}
                </li>
              );
              groups[g].forEach((e) => {
                const eventIndex = events.indexOf(e);
                items.push(
                  <li
                    key={`${e.time}-${e.event}`}
                    draggable
                    onDragStart={onDragStart(eventIndex)}
                    onDrop={onDrop(eventIndex)}
                    onDragOver={(ev) => ev.preventDefault()}
                    tabIndex={0}
                    className="pl-2"
                  >
                    {`${e.time}${e.end ? ` - ${e.end}` : ''}: `}
                    <span className="inline">
                      <ReactMarkdown
                        components={{
                          p: 'span',
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              onClick={(ev) => href && handleLinkClick(ev, href)}
                              className="text-blue-600 underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {e.event}
                      </ReactMarkdown>
                    </span>
                    {e.link && (
                      <a
                        href={e.link}
                        onClick={(ev) => handleLinkClick(ev, e.link!)}
                        className="text-blue-600 underline ml-2"
                      >
                        evidence
                      </a>
                    )}
                  </li>
                );
              });
            });
            return items;
          })()}
        </ul>
      </div>
    </div>
  );
};

export default TimelineBuilder;

export const displayTimelineBuilder = (_addFolder?: any, openApp?: any) => (
  <TimelineBuilder openApp={openApp} />
);

