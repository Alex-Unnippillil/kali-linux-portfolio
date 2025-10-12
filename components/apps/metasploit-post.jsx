import React, { useEffect, useState } from 'react';

const redactedLogs = [
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
  const [events, setEvents] = useState([]);

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
      className="h-full w-full overflow-auto rounded-xl border border-white/10 bg-[var(--kali-panel)]/95 p-4 text-white shadow-kali-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)]"
      tabIndex={0}
      aria-label="Metasploit post-exploitation timeline"
    >
      <h2 className="mb-4 text-lg font-semibold text-white">Post-Exploitation Timeline</h2>
      <ul className="relative space-y-4 border-l border-kali-primary/40 pl-6">
        {events.map((e) => (
          <li key={e.time} className="relative pl-6 text-sm text-white/90">
            <span className="absolute left-0 top-2 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full bg-kali-primary shadow-[0_0_0_3px_rgba(15,118,110,0.35)]" />
            <time className="block text-xs uppercase tracking-wide text-white/60">{e.time}</time>
            <p className="mt-1 text-white/90">{e.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetasploitPost;
