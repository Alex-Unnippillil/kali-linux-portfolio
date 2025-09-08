'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface StatusResponse {
  status?: string;
  message?: string;
  indicator?: string;
  [key: string]: any;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json() as Promise<StatusResponse>;
};

export default function SystemStatus() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const { data, error } = useSWR<StatusResponse>(
    offline ? null : 'https://status.kali.org/api/status.json',
    fetcher,
  );

  let text = 'Loading…';
  let color = 'bg-gray-500';

  if (offline) {
    text = 'Offline';
  } else if (error) {
    text = 'Status Unavailable';
  } else if (data) {
    const indicator = (data.indicator || data.status || '').toLowerCase();
    text = data.message || data.status || 'Unknown';
    if (['critical', 'major', 'down', 'danger', 'outage'].some((s) => indicator.includes(s))) {
      color = 'bg-red-600';
    } else if (
      ['minor', 'degraded', 'warning', 'maintenance'].some((s) => indicator.includes(s))
    ) {
      color = 'bg-yellow-500';
    } else {
      color = 'bg-green-600';
    }
  }

  return (
    <Link
      href="https://status.kali.org/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block rounded-full px-3 py-1 text-xs text-white ${color}`}
    >
      {text}
    </Link>
  );
}

