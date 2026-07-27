'use client';

import { useEffect, useMemo, useState } from 'react';

interface DockClockProps {
  className?: string;
}

const FALLBACK_DISPLAY = '--:--:--';

function formatTime(isoTimestamp: string | null) {
  if (!isoTimestamp) {
    return FALLBACK_DISPLAY;
  }

  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return FALLBACK_DISPLAY;
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function DockClock({ className }: DockClockProps) {
  const [isoTime, setIsoTime] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/clock');

    eventSource.onmessage = (event) => {
      if (event?.data) {
        setIsoTime(event.data);
      }
    };

    eventSource.onerror = (event) => {
      console.error('Dock clock stream error:', event);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const displayTime = useMemo(() => formatTime(isoTime), [isoTime]);

  return (
    <time dateTime={isoTime ?? undefined} className={className}>
      {displayTime}
    </time>
  );
}
