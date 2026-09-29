"use client";

import { useEffect, useState } from "react";
import settings from "../../data/settings.json";

interface Settings {
  extraTimeZones?: string[];
}

const extras: string[] = (settings as Settings).extraTimeZones?.slice(0, 2) || [];

function formatTime(date: Date, timeZone?: string) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

export default function ClockPopover() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());
    const id = setInterval(update, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-4 text-ubt-grey">
      <div suppressHydrationWarning>
        {formatTime(now)} <span className="ml-2 text-xs">Local</span>
      </div>
      {extras.map((tz) => (
        <div key={tz} suppressHydrationWarning>
          {formatTime(now, tz)} <span className="ml-2 text-xs">{tz}</span>
        </div>
      ))}
    </div>
  );
}

