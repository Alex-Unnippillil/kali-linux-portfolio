import React from 'react';

export const OutcomeBanner = ({ text }: { text: string }) => (
  <div className="rounded border border-kali-border bg-kali-surface p-2 text-sm" role="status" aria-live="polite">
    {text}
  </div>
);
