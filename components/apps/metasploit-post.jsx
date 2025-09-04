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
    <div className="h-full w-full bg-gray-900 text-white p-4 overflow-auto">
      <h2 className="text-lg mb-4">Post-Exploitation Timeline</h2>
      <ul className="relative border-l border-gray-700 pl-4">
        {events.map((e) => (
          <li key={e.time} className="mb-4 ml-4">
            <span className="absolute -left-1.5 w-3 h-3 bg-blue-500 rounded-full"></span>
            <time className="block text-xs text-gray-400">{e.time}</time>
            <p className="mt-1">{e.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetasploitPost;
