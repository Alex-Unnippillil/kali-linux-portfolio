import React from 'react';

export const ShoeMeter = ({ remaining, percent }: { remaining: number; percent: number }) => (
  <div className="rounded border border-kali-border p-2 text-xs" aria-label="Shoe status">
    <p>Cards left: {remaining}</p>
    <div className="mt-1 h-2 w-full rounded bg-kali-muted">
      <div className="h-2 rounded bg-kali-primary" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  </div>
);
