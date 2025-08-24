import React from 'react';

interface ErrorPaneProps {
  code: string;
  message: string;
  onRetry?: () => void;
}

const ErrorPane: React.FC<ErrorPaneProps> = ({ code, message, onRetry }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white space-y-2 p-4 text-center">
    <div className="text-lg font-bold">{code}</div>
    <div>{message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
      >
        Retry
      </button>
    )}
  </div>
);

export default ErrorPane;
