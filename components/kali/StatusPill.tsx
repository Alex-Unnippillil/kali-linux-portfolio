import React, { useEffect, useState } from 'react';
import ia from '../../data/ia.json';

type StatusState = 'operational' | 'degraded' | 'down' | 'unknown';

function normalize(raw: any): StatusState {
  const val = String(raw || '').toLowerCase();
  if (['operational', 'ok', 'none', 'green'].includes(val)) return 'operational';
  if (
    ['degraded', 'minor', 'maintenance', 'warning', 'amber', 'partial_outage'].includes(
      val,
    )
  )
    return 'degraded';
  if (['down', 'major', 'critical', 'red', 'outage'].includes(val)) return 'down';
  return 'unknown';
}

const colorMap: Record<StatusState, string> = {
  operational: 'bg-green-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  unknown: 'bg-gray-500',
};

const statusLink = (() => {
  const groups = (ia as any).footer?.groups ?? [];
  for (const g of groups) {
    const match = g.items?.find((i: any) => /status/i.test(i.label));
    if (match) return match.href as string;
  }
  return undefined;
})();

export default function StatusPill() {
  const [status, setStatus] = useState<StatusState>('unknown');

  useEffect(() => {
    const endpoint = process.env.NEXT_PUBLIC_STATUS_ENDPOINT;
    if (!endpoint) return;
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(endpoint);
        const json = await res.json();
        const raw = json.status?.indicator ?? json.status ?? json.indicator;
        if (active) setStatus(normalize(raw));
      } catch {
        if (active) setStatus('unknown');
      }
    };
    fetchStatus();
    return () => {
      active = false;
    };
  }, []);

  if (!statusLink) return null;
  const label =
    status === 'unknown'
      ? 'Status Unknown'
      : status === 'operational'
      ? 'Operational'
      : status === 'degraded'
      ? 'Degraded'
      : 'Down';

  return (
    <a
      href={statusLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${colorMap[status]}`}
      aria-label={`System status: ${label}`}
    >
      {label}
    </a>
  );
}
