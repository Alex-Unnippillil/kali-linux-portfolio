import React from 'react';
import AlertBanner from './common/AlertBanner';

interface WarningBannerProps {
  children: React.ReactNode;
  title?: string;
}

export default function WarningBanner({ children, title }: WarningBannerProps) {
  return (
    <AlertBanner tone="warning" title={title}>
      {children}
    </AlertBanner>
  );
}
