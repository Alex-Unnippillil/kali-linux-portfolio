import React from 'react';

interface WarningBannerProps {
  children: React.ReactNode;
}

export default function WarningBanner({ children }: WarningBannerProps) {
  return (
    <div className="flex items-center bg-amber-100 text-amber-900 p-2" role="alert">
      <span className="mr-2" role="img" aria-label="warning">
        ⚠️
      </span>
      <span>{children}</span>
    </div>
  );
}
