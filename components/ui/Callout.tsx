import React from 'react';

interface CalloutProps {
  /** Optional title displayed at the top of the callout */
  title?: string;
  /** Callout contents */
  children: React.ReactNode;
  /** Visual style of the callout */
  type?: 'info' | 'success' | 'warning' | 'error';
}

const styles: Record<NonNullable<CalloutProps['type']>, { bg: string; text: string; border: string; role: 'status' | 'alert' }> = {
  info: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', role: 'status' },
  success: { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300', role: 'status' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', role: 'alert' },
  error: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', role: 'alert' },
};

export default function Callout({ title, children, type = 'info' }: CalloutProps) {
  const { bg, text, border, role } = styles[type];
  const titleId = title ? `${title.replace(/\s+/g, '-')}-callout-title` : undefined;

  return (
    <div
      role={role}
      aria-labelledby={title ? titleId : undefined}
      className={`p-4 border-l-4 ${bg} ${text} ${border}`.trim()}
    >
      {title && (
        <p id={titleId} className="font-semibold mb-2">
          {title}
        </p>
      )}
      <div>{children}</div>
    </div>
  );
}
