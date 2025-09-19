import React from 'react';

interface WarningBannerProps {
  title?: string;
  messages?: string[];
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}

export default function WarningBanner({
  title,
  messages,
  actionHref,
  actionLabel = 'Fix it',
  children,
}: WarningBannerProps) {
  return (
    <div
      className="flex items-start gap-2 rounded border border-amber-300 bg-amber-100 p-3 text-amber-900 shadow-sm"
      role="alert"
    >
      <span className="pt-0.5" role="img" aria-label="warning">
        ⚠️
      </span>
      <div className="flex-1 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {messages && messages.length > 0 ? (
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {messages.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        ) : null}
        {children}
        {actionHref ? (
          <p className="mt-2">
            <a className="font-semibold underline" href={actionHref}>
              {actionLabel}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
