import React, { useEffect, useRef } from 'react';

interface ErrorSummaryProps {
  errors: string[];
  className?: string;
}

const ErrorSummary: React.FC<ErrorSummaryProps> = ({ errors, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0 && ref.current) {
      ref.current.focus();
    }
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-live="assertive"
      className={`mb-4 border border-red-600 bg-red-50 p-2 text-red-700 ${className}`.trim()}
    >
      <p className="font-semibold">Please fix the following errors:</p>
      <ul className="list-disc list-inside">
        {errors.map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
    </div>
  );
};

export default ErrorSummary;
