'use client';

import type { ReactNode } from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  className?: string;
  children?: ReactNode;
}

const ShareButton = ({ url, title, className, children }: ShareButtonProps) => {
  const handleShare = async () => {
    const share = (navigator as Navigator & {
      share?: (data?: ShareData) => Promise<void>;
    }).share;

    if (!share) {
      window.alert('Sharing is unavailable on this device.');
      return;
    }

    try {
      await share({ title, url });
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      console.error('Failed to share the provided link.', error);
    }
  };

  return (
    <button type="button" onClick={handleShare} className={className}>
      {children ?? 'Share'}
    </button>
  );
};

export default ShareButton;
