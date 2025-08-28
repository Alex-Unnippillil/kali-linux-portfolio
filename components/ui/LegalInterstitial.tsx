'use client';

import React from 'react';

interface LegalInterstitialProps {
  onAccept: () => void;
}

const LegalInterstitial: React.FC<LegalInterstitialProps> = ({ onAccept }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overlay-bg text-white">
    <div className="max-w-md rounded bg-gray-900 p-6 text-center">
      <h2 className="mb-4 text-xl font-bold">Legal Use Only</h2>
      <p className="mb-6 text-sm">
        This demo is for educational purposes only. Only interact with systems you own or have explicit permission to test.
      </p>
      <button
        type="button"
        onClick={onAccept}
        className="rounded bg-blue-600 px-4 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
      >
        I Understand
      </button>
    </div>
  </div>
);

export default LegalInterstitial;
