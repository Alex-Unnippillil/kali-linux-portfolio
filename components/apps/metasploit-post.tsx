import React, { useEffect, useState } from 'react';

interface RedactedLogEntry {
  time: string;
  message: string;
}

const redactedLogs: RedactedLogEntry[] = [
  {
    time: '2024-05-01 10:15:32',
    message: 'Harvested credentials from [REDACTED] domain controller',
  },
  {
    time: '2024-05-01 10:20:17',
    message: 'Escalated privileges on host [REDACTED]',
  },
  {
    time: '2024-05-01 10:25:03',
    message: 'Established persistence via scheduled task [REDACTED]',
  },
  {
    time: '2024-05-01 10:30:45',
    message: 'Cleaned event logs on [REDACTED] server',
  },
];

const MetasploitPost = () => {
  const [events, setEvents] = useState<RedactedLogEntry[]>([]);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setEvents((prev) => [...prev, redactedLogs[idx]]);
      idx += 1;
      if (idx >= redactedLogs.length) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="h-full w-full overflow-auto rounded-xl border border-kali-border/60 bg-[var(--kali-panel)]/95 p-4 text-kali-text shadow-kali-panel focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-kali-focus focus-visible:outline-offset-2"
      tabIndex={0}
      aria-label="Metasploit post-exploitation timeline"
    >
      <h2 className="mb-4 text-lg font-semibold text-kali-text">
        Post-Exploitation Timeline
      </h2>
      <ul className="relative space-y-4 border-l border-kali-primary/40 pl-6">
        {events.map((event) => (
          <li key={event.time} className="relative pl-6 text-sm text-kali-text/90">
            <span className="absolute left-0 top-2 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-kali-primary ring-2 ring-kali-primary/40 ring-offset-2 ring-offset-[var(--kali-panel)]" />
            <time className="block text-xs uppercase tracking-wide text-kali-text/60">
              {event.time}
            </time>
            <p className="mt-1 text-kali-text/90">{event.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetasploitPost;
