import React from 'react';

interface WarningBannerProps {
  children: React.ReactNode;
}

export default function WarningBanner({ children }: WarningBannerProps) {
  return (
    <div className="flex items-center gap-xs bg-surface-muted text-status-warning border-l-4 border-status-warning border-opacity-80 p-sm rounded-md" role="alert">
      <span className="text-lg" role="img" aria-label="warning">
        ⚠️
      </span>
      <span className="text-sm text-text-primary">{children}</span>
    </div>
  );
}
