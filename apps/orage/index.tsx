'use client';

import { useEffect, useRef, useState } from 'react';

interface OrageEvent {
  id: string;
  title: string;
  start: string; // ISO string
}

const storageKey = 'orage-events';

const randId = () => Math.random().toString(36).slice(2);

const parseIcsDate = (value: string) => {
  // Supports YYYYMMDD or YYYYMMDDTHHmmssZ
  const y = value.slice(0, 4);
  const m = value.slice(4, 6);
  const d = value.slice(6, 8);
  if (value.includes('T')) {
    const h = value.slice(9, 11);
    const min = value.slice(11, 13);
    return `${y}-${m}-${d}T${h}:${min}`;
  }
  return `${y}-${m}-${d}T00:00`;
};

const parseIcs = (text: string): OrageEvent[] => {
  const events: OrageEvent[] = [];
  const lines = text.split(/\r?\n/);
  let current: any = null;
  lines.forEach((line) => {
    if (line.startsWith('BEGIN:VEVENT')) current = {};
    else if (line.startsWith('END:VEVENT')) {
      if (current?.summary && current?.dtstart) {
        events.push({ id: randId(), title: current.summary, start: parseIcsDate(current.dtstart) });
      }
      current = null;
    } else if (current) {
      const [rawKey, ...rest] = line.split(':');
      const key = rawKey.toUpperCase();
      const value = rest.join(':');
      if (key.startsWith('SUMMARY')) current.summary = value;
      else if (key.startsWith('DTSTART')) current.dtstart = value;
    }
  });
  return events;
};

export default function Orage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [events, setEvents] = useState<OrageEvent[]>([]);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setEvents(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(events));
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    events.forEach((ev) => {
      const diff = new Date(ev.start).getTime() - Date.now();
      if (diff > 0) {
        const id = window.setTimeout(() => {
          setNotifications((n) => [...n, ev.title]);
        }, diff);
        timers.current.push(id);
      }
    });
  }, [events]);

  const addEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !start) return;
    setEvents((prev) => [...prev, { id: randId(), title, start }]);
    setTitle('');
    setStart('');
  };

  const handleIcs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseIcs(String(reader.result));
      setEvents((prev) => [...prev, ...imported]);
    };
    reader.readAsText(file);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const weeks: Date[][] = [];
  let day = 1 - firstDay;
  for (let w = 0; w < 6; w += 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(year, month, day));
      day += 1;
    }
    weeks.push(week);
  }

  const eventsForSelected = events.filter((ev) => ev.start.slice(0, 10) === selectedDate);

  return (
    <div className="p-2 space-y-2 text-sm">
      <div className="flex items-center space-x-2">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>{'<'}</button>
        <div className="flex-1 text-center font-bold">
          {currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>{'>'}</button>
        <input type="file" accept=".ics,text/calendar" onChange={handleIcs} />
      </div>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <th key={d} className="border px-1">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((date, di) => {
                const dateStr = date.toISOString().slice(0, 10);
                const inMonth = date.getMonth() === month;
                const hasEvent = events.some((ev) => ev.start.slice(0, 10) === dateStr);
                return (
                  <td
                    key={di}
                    className={`border h-8 cursor-pointer select-none ${
                      inMonth ? '' : 'bg-gray-200'
                    } ${selectedDate === dateStr ? 'bg-blue-200' : ''}`}
                    onClick={() => inMonth && setSelectedDate(dateStr)}
                  >
                    <div className="relative">
                      {date.getDate()}
                      {hasEvent && (
                        <span className="absolute bottom-0 right-0 w-1 h-1 bg-red-500 rounded-full" />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={addEvent} className="flex space-x-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="border px-1 flex-1"
        />
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border px-1"
        />
        <button type="submit" className="border px-2">
          Add
        </button>
      </form>
      <div>
        <h3 className="font-bold">Events on {selectedDate}</h3>
        <ul>
          {eventsForSelected.map((ev) => (
            <li key={ev.id}>
              {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {ev.title}
            </li>
          ))}
        </ul>
      </div>
      {notifications.length > 0 && (
        <div className="fixed bottom-2 right-2 bg-white text-black border p-2 space-y-1">
          {notifications.map((n, i) => (
            <div key={i} className="flex justify-between space-x-2">
              <span>{n}</span>
              <button
                className="text-red-600"
                onClick={() => setNotifications((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

