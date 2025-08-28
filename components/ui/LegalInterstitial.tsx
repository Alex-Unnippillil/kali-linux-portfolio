'use client';

import React, { useEffect, useRef } from 'react';

interface LegalInterstitialProps {
  onAccept: () => void;
}

const LegalInterstitial: React.FC<LegalInterstitialProps> = ({ onAccept }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    buttonRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onAccept();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (opener.current instanceof HTMLElement) {
        opener.current.focus();
      }
    };
  }, [onAccept]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-heading"
      ref={dialogRef}
    >
      <div className="max-w-md rounded bg-gray-900 p-6 text-center" tabIndex={-1}>
        <h2 id="legal-heading" className="mb-4 text-xl font-bold">
          Legal Use Only
        </h2>
        <p className="mb-6 text-sm">
          This demo is for educational purposes only. Only interact with systems you own or have explicit permission to test.
        </p>
        <button
          type="button"
          ref={buttonRef}
          onClick={onAccept}
          className="rounded bg-blue-600 px-4 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

export default LegalInterstitial;
