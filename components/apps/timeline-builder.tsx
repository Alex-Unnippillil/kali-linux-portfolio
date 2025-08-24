import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import Timeline from 'react-visjs-timeline';
import { FixedSizeList as List } from 'react-window';

export interface TimelineEvent {
  time: string;
  end?: string;
  event: string;
  group?: string;
  tags?: string[];
  link?: string;
}

interface Props {
  openApp?: (id: string) => void;
}

const TimelineBuilder: React.FC<Props> = ({ openApp }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [snap, setSnap] = useState<'none' | 'day' | 'week'>('none');
  const [cluster, setCluster] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const workerRef = useRef<Worker>();
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<any>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./timeline-builder.worker.ts', import.meta.url)
    );
    workerRef.current.onmessage = (e: MessageEvent<any>) => {
      setItems(e.data.items);
      setGroups(e.data.groups);
    };
    return () => workerRef.current?.terminate();
  }, []);

  const filtered = useMemo(
    () => filterEvents(events, search),
    [events, search]
  );

  useEffect(() => {
    workerRef.current?.postMessage(filtered);
  }, [filtered]);

  useEffect(() => {
    if (timelineRef.current?.visJsTimeline) {
      timelineRef.current.visJsTimeline.setOptions({ cluster });
    }
  }, [cluster, items]);

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
              tags: r.tags
                ? String(r.tags)
                    .split(/[|,]/)
                    .map((t: string) => t.trim())
                    .filter(Boolean)
                : undefined,
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
              tags: Array.isArray(r.tags)
                ? r.tags
                : typeof r.tags === 'string'
                    ? r.tags
                        .split(/[|,]/)
                        .map((t: string) => t.trim())
                        .filter(Boolean)
                    : undefined,
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
    const promises = Array.from(files).map((file) => {
      const name = file.name.toLowerCase();
      if (name.endsWith('.json')) return parseJson(file);
      if (name.endsWith('.csv')) return parseCsv(file);
      return parseLog(file);
    });
    Promise.all(promises).then((all) => {
      const merged = [...events, ...all.flat()];
      const unique = Array.from(
        new Map(merged.map((e) => [`${e.time}-${e.event}`, e])).values()
      );
      setEvents(sortEvents(unique));
    });
  };

  const exportCsv = () => {
    const csv = Papa.unparse(
      events.map((e) => ({
        time: e.time,
        end: e.end,
        event: e.event,
        tags: e.tags ? e.tags.join('|') : '',
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timeline.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    if (!containerRef.current) return;
    const dataUrl = await toPng(containerRef.current);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'timeline.png';
    link.click();
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-2 space-y-2">
      <div className="flex space-x-2 items-center">
        <input
          type="file"
          accept=".csv,.json,.log,.txt"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white text-black px-2 rounded"
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
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={cluster}
            onChange={(e) => setCluster(e.target.checked)}
          />
          <span>Cluster</span>
        </label>
        <button
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded"
          onClick={exportPng}
        >
          Export PNG
        </button>
        <button
          className="bg-gray-700 hover:bg-gray-600 px-2 rounded"
          onClick={exportCsv}
        >
          Export CSV
        </button>
      </div>
      <div ref={containerRef} className="flex-1 bg-white rounded text-black">
        <Timeline
          ref={timelineRef}
          items={items}
          groups={groups}
          options={{
            stack: true,
            height: '70%',
            width: '100%',
            cluster,
          }}
        />
        <div className="h-[30%] overflow-hidden">
          <List height={200} itemCount={filtered.length} itemSize={24} width="100%">
            {({ index, style }) => {
              const ev = filtered[index];
              return (
                <div style={style} className="px-2 text-xs whitespace-nowrap overflow-hidden">
                  {new Date(ev.time).toISOString()} - {ev.event}
                  {ev.tags && ev.tags.length > 0 && ` [${ev.tags.join(',')}]`}
                </div>
              );
            }}
          </List>
        </div>
      </div>
    </div>
  );
};

export default TimelineBuilder;

export const displayTimelineBuilder = (_addFolder?: any, openApp?: any) => (
  <TimelineBuilder openApp={openApp} />
);

export const parseLogText = (text: string): TimelineEvent[] => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines
    .map((line) => {
      const match = line.match(/^(\S+)\s+(.*)$/);
      if (!match) return null;
      const time = match[1];
      const rest = match[2];
      const date = new Date(time);
      if (isNaN(date.getTime())) return null;
      let msg = rest;
      let tags: string[] | undefined;
      const tagMatch = msg.match(/^\[(.+?)\]\s*/);
      if (tagMatch) {
        tags = tagMatch[1]
          .split(/[|,]/)
          .map((t) => t.trim())
          .filter(Boolean);
        msg = msg.slice(tagMatch[0].length);
      }
      return { time: date.toISOString(), event: msg, tags } as TimelineEvent;
    })
    .filter((e): e is TimelineEvent => e !== null);
};

const parseLog = (file: File): Promise<TimelineEvent[]> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseLogText(reader.result as string));
    reader.readAsText(file);
  });

export const filterEvents = (evts: TimelineEvent[], term: string) => {
  const q = term.toLowerCase();
  if (!q) return evts;
  return evts.filter(
    (e) =>
      e.event.toLowerCase().includes(q) ||
      e.tags?.some((t) => t.toLowerCase().includes(q))
  );
};
