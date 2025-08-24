import React from 'react';

interface ErrorPaneProps {
  code: string;
  message: string;
}

const ErrorPane: React.FC<ErrorPaneProps> = ({ code, message }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white space-y-2 p-4 text-center">
    <div className="text-lg font-bold">{code}</div>
    <div>{message}</div>
  </div>
);

export default ErrorPane;
