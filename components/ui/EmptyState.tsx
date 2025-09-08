import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  headline: string;
  helperText?: string;
  className?: string;
}

export default function EmptyState({
  icon,
  headline,
  helperText,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`.trim()}>
      {icon && (
        <div className="text-4xl mb-2 text-muted" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-text">{headline}</h3>
      {helperText && <p className="mt-1 text-sm text-muted">{helperText}</p>}
    </div>
  );
}
