'use client';

import React from 'react';
import errorMap from '../utils/errorMap';

interface Props {
  code: string | number | null;
  onClose?: () => void;
}

const ErrorBanner: React.FC<Props> = ({ code, onClose }) => {
  if (!code) return null;
  const message = errorMap[code] || 'An unexpected error occurred.';
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between rounded bg-red-600 p-3 text-sm text-white"
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-2 font-bold"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
