import React, { useState } from 'react';

interface WarningBannerProps {
  children?: React.ReactNode;
  onDismiss?: () => void;
}

export default function WarningBanner({ children, onDismiss }: WarningBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-100 px-3 py-2 text-sm text-amber-900"
      role="alert"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="flex-1 leading-snug">
        {children ?? 'Simulation only. No real attacks occur.'}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-transparent bg-amber-200 text-amber-900 transition hover:bg-amber-300 focus:outline-none focus-visible:ring focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-100"
        aria-label="Dismiss warning"
      >
        <span aria-hidden="true" className="text-lg">
          ×
        </span>
      </button>
    </div>
  );
}
