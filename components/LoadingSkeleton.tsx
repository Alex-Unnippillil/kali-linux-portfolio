import React, { useEffect, useState } from 'react';

export default function LoadingSkeleton() {
  const [showMessage, setShowMessage] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const msg = setTimeout(() => setShowMessage(true), 2000);
    const spin = setTimeout(() => setShowSpinner(true), 5000);
    return () => {
      clearTimeout(msg);
      clearTimeout(spin);
    };
  }, []);

  return (
    <div className="p-4 space-y-4" role="status" aria-live="polite">
      <div className="animate-pulse space-y-2">
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
      {showMessage && (
        <p className="text-sm text-gray-500">
          Still loading—thanks for your patience.
        </p>
      )}
      {showSpinner && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span>Almost there…</span>
        </div>
      )}
    </div>
  );
}
