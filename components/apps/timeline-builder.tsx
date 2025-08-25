import React, { useState } from 'react';
import Papa from 'papaparse';
import dynamic from 'next/dynamic';

const Chrono = dynamic(() => import('react-chrono').then(m => m.Chrono), {
  ssr: false,
});


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

const TimelineBuilder: React.FC<Props> = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [search, setSearch] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const parsed: TimelineEvent[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') parsed.push(...(await parseCsv(file)));
      else if (ext === 'json') parsed.push(...(await parseJson(file)));
      else if (ext === 'log' || ext === 'txt') parsed.push(...(await parseLog(file)));
    }
    setEvents(sortEvents(parsed));
  };

  const filtered = filterEvents(events, search);

  const items = filtered.map((e) => ({
    title: new Date(e.time).toISOString(),
    cardTitle: e.event,
    cardSubtitle: e.group,
    cardDetailedText: e.tags && e.tags.length > 0 ? e.tags.join(', ') : undefined,
  }));

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
      </div>
      {items.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <Chrono items={items} mode="VERTICAL" scrollable={{ scrollbar: true }} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Load a CSV, JSON, or log file to begin.
        </div>
      )}

    </div>
  );
}

export const displayTimelineBuilder = (_addFolder?: any, openApp?: any) => (
  <TimelineBuilder />
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
          .filter((e) => e.time && e.event);
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
          .map((e: any) => ({
            time: e.time || e.start || e.date || e.timestamp,
            end: e.end || e.finish,
            event: e.event || e.title || e.description,
            group: e.group || e.category,
            tags: e.tags,
            link: e.link || e.evidence || e.url,
          }))
          .filter((e: TimelineEvent) => e.time && e.event);
        resolve(parsed);
      } catch {
        resolve([]);
      }
    };
    reader.readAsText(file);
  });

const sortEvents = (evts: TimelineEvent[]) =>
  evts.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());


export const filterEvents = (evts: TimelineEvent[], term: string) => {
  const q = term.toLowerCase();
  if (!q) return evts;
  return evts.filter(
    (e) =>
      e.event.toLowerCase().includes(q) ||
      e.tags?.some((t) => t.toLowerCase().includes(q))
  );
};
