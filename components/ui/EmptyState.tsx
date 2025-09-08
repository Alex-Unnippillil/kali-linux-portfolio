import React from 'react';

type EmptyStateVariant = 'default' | 'search' | 'error';

interface EmptyStateProps {
  icon?: React.ReactNode;
  variant?: EmptyStateVariant;
  headline: string;
  helperText?: string;
  className?: string;
}

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  default: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="13" y2="16" />
    </svg>
  ),
  search: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16" y1="16" x2="20" y2="20" />
    </svg>
  ),
  error: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export default function EmptyState({
  icon,
  variant = 'default',
  headline,
  helperText,
  className = '',
}: EmptyStateProps) {
  const illustration = icon ?? illustrations[variant];
  return (
    <div className={`flex flex-col items-center text-center ${className}`.trim()}>
      {illustration && (
        <div className="text-4xl mb-2 text-muted" aria-hidden="true">
          {illustration}
        </div>
      )}
      <h3 className="font-semibold text-text">{headline}</h3>
      {helperText && <p className="mt-1 text-sm text-muted">{helperText}</p>}
    </div>
  );
}
