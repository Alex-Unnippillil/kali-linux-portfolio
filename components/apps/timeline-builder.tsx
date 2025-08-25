import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';

// react-chrono runs client-side only
const Chrono = dynamic(() => import('react-chrono').then(m => m.Chrono), { ssr: false });

export interface TimelineEvent {
  time: string;
  end?: string;
  event: string;
  group?: string;
  tags?: string[];
  link?: string;
}

export default function TimelineBuilder() {
  const [rows, setRows] = useState<TimelineEvent[]>([]);

  const items = useMemo(() => {
    return rows
      .slice()
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map((r) => ({
        title: new Date(r.time).toLocaleDateString(),
        cardTitle: r.event,
        cardSubtitle: r.group ?? '',
        url: r.link,
      }));
  }, [rows]);

  const onCsv = (file: File) => {
    Papa.parse<TimelineEvent>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows((res.data || []).filter(Boolean)),
    });
  };

  return (
    <div className="h-full w-full bg-panel p-3 overflow-auto">
      <input
        type="file"
        accept=".csv"
        onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
        className="mb-3"
      />
      <div style={{ height: 'calc(100% - 3rem)' }}>
        <Chrono items={items} mode="VERTICAL" hideControls />
      </div>
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

export const filterEvents = (evts: TimelineEvent[], term: string) => {
  const q = term.toLowerCase();
  if (!q) return evts;
  return evts.filter(
    (e) =>
      e.event.toLowerCase().includes(q) ||
      e.tags?.some((t) => t.toLowerCase().includes(q))
  );
};
