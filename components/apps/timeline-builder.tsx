import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import Timeline from 'react-visjs-timeline';

export interface TimelineEvent {
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
  const [cluster, setCluster] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
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

  useEffect(() => {
    workerRef.current?.postMessage(events);
  }, [events]);

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
      <div ref={containerRef} className="flex-1 bg-white rounded text-black">
        <Timeline
          ref={timelineRef}
          items={items}
          groups={groups}
          options={{
            stack: true,
            height: '100%',
            width: '100%',
            cluster,
          }}
        />
      </div>
    </div>
  );
};

export default TimelineBuilder;

export const displayTimelineBuilder = (_addFolder?: any, openApp?: any) => (
  <TimelineBuilder openApp={openApp} />
);
