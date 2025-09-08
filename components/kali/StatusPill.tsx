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

function useStatus(): StatusState {
  const [status, setStatus] = useState<StatusState>('unknown');

  useEffect(() => {
    const endpoint = process.env.NEXT_PUBLIC_STATUS_ENDPOINT || '/api/status';
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(endpoint);
        const json = await res.json();
        const raw =
          json.status?.indicator ??
          json.status ??
          json.indicator ??
          process.env.NEXT_PUBLIC_STATUS;
        if (active) setStatus(normalize(raw));
      } catch {
        if (active) setStatus(normalize(process.env.NEXT_PUBLIC_STATUS));
      }
    };
    fetchStatus();
    return () => {
      active = false;
    };
  }, []);

  return status;
}

export function StatusChip() {
  const status = useStatus();
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
      aria-label={`System status: ${label}`}
      className="relative z-10 flex items-center"
    >
      <span className="sr-only">{label}</span>
      <span
        className={`h-3 w-3 rounded-full ring-2 ring-black/20 ${colorMap[status]}`}
      />
    </a>
  );
}

export default function StatusPill() {
  const status = useStatus();

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
