"use client";

import React, { useEffect, useState } from "react";

interface Event {
  date: string;
  title: string;
}

export default function ClockPopover() {
  const [events, setEvents] = useState<Event[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/data/events.json")
      .then((res) => res.json())
      .then((data: Event[]) => setEvents(data))
      .catch(() => setEvents([]));
  }, []);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const weeks: Array<(Date | null)[]> = [];
  let current = new Date(firstDay);
  let week: (Date | null)[] = Array(firstDay.getDay()).fill(null);

  while (current <= lastDay) {
    week.push(new Date(current));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const eventsOnDay = (date: Date) =>
    events.filter((e) => e.date === date.toISOString().slice(0, 10));

  const upcoming = events.filter(
    (e) =>
      new Date(e.date) >= new Date(today.toDateString()) &&
      !dismissed.has(e.date + e.title)
  );

  const dismiss = (key: string) =>
    setDismissed((prev) => new Set(prev).add(key));

  const monthName = today.toLocaleString("default", { month: "long" });

  return (
    <div className="p-4 text-white">
      <h2 className="text-center text-sm mb-2">
        {monthName} {today.getFullYear()}
      </h2>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-ubt-grey">
            {d}
          </div>
        ))}
        {weeks.flat().map((date, idx) => {
          if (!date) return <div key={idx} className="h-8" />;
          const dayEvents = eventsOnDay(date);
          return (
            <div key={idx} className="relative h-8">
              <span>{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayEvents.map((_, i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full bg-ubt-orange"
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {upcoming.length > 0 && (
        <div className="mt-4 space-y-2">
          {upcoming.map((event) => {
            const key = event.date + event.title;
            return (
              <div
                key={key}
                className="flex items-center justify-between bg-ub-cool-grey p-2 rounded"
              >
                <span className="text-sm">
                  {event.title} – {event.date}
                </span>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(key)}
                  className="text-ubt-grey hover:text-white"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

