import React, { useState } from 'react';

interface WarningBannerProps {
  children: React.ReactNode;
}

export default function WarningBanner({ children }: WarningBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 bg-amber-100 text-amber-900 px-3 py-2 max-h-[72px] overflow-y-auto rounded"
      role="alert"
    >
      <span className="text-lg leading-none" role="img" aria-label="warning">
        ⚠️
      </span>
      <span className="flex-1 text-sm leading-snug">{children}</span>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="inline-flex shrink-0 items-center rounded-md bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-100"
        aria-label="Dismiss warning banner"
        title="Dismiss"
      >
        Close
      </button>
    </div>
  );
}
