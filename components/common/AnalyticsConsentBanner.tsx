'use client';

import React, { useState } from 'react';

interface Props {
  onAccept: () => void;
}

const AnalyticsConsentBanner: React.FC<Props> = ({ onAccept }) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleAccept = () => {
    setVisible(false);
    onAccept();
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between bg-gray-800 text-white p-4 text-sm"
      role="dialog"
      aria-live="polite"
    >
      <span>We use anonymous analytics to improve this site.</span>
      <button
        type="button"
        onClick={handleAccept}
        className="ml-4 px-2 py-1 bg-blue-600 rounded"
      >
        Allow
      </button>
    </div>
  );
};

export default AnalyticsConsentBanner;
