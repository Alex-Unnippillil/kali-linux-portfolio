'use client';

import { useState, useEffect } from 'react';

interface PromoBannerProps {
  messages: string[];
  rotateInterval?: number; // ms
  onDismiss?: () => void;
}

export default function PromoBanner({
  messages,
  rotateInterval = 5000,
  onDismiss,
}: PromoBannerProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, rotateInterval);
    return () => clearInterval(id);
  }, [messages, rotateInterval]);

  if (!visible || messages.length === 0) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className="promo-banner absolute top-0 w-screen flex items-center justify-center bg-ubt-grey text-ub-grey text-sm h-10 z-50"
      role="region"
      aria-label="Promotional banner"
    >
      <span className="px-4 text-center flex-1">{messages[index]}</span>
      <button
        aria-label="Dismiss promotional banner"
        onClick={dismiss}
        className="px-4"
      >
        ×
      </button>
    </div>
  );
}

