import React from 'react';

interface ErrorPaneProps {
  code: string;
  message: string;
  onReload?: () => void;
}

const ErrorPane: React.FC<ErrorPaneProps> = ({ code, message, onReload }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white space-y-2 p-4 text-center">
    <div className="text-lg font-bold">{code}</div>
    <div>{message}</div>
    {onReload && (
      <button
        onClick={onReload}
        className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
      >
        Reload app
      </button>
    )}
  </div>
);

export default ErrorPane;
