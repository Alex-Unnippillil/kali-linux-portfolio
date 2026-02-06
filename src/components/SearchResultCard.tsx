import React, { useMemo } from 'react';
import { trackEvent } from '@/lib/analytics-client';

export type SearchResultIntent = string;

export interface SearchResultCardProps {
  title: string;
  description?: string;
  url: string;
  intent?: SearchResultIntent;
}

export default function SearchResultCard({
  title,
  description,
  url,
  intent = 'navigate',
}: SearchResultCardProps) {
  const layoutEnabled = process.env.NEXT_PUBLIC_SEARCH_RESULT_INTENT_LAYOUT === 'true';
  const abTesting = process.env.NEXT_PUBLIC_SEARCH_RESULT_AB_TEST === 'true';

  const variant = useMemo(() => {
    if (!abTesting) return 'control';
    return Math.random() < 0.5 ? 'A' : 'B';
  }, [abTesting]);

  const handleClick = () => {
    trackEvent('search_result_click', { variant, intent });
  };

  if (!layoutEnabled) {
    return (
      <a
        href={url}
        onClick={handleClick}
        data-testid="legacy-layout"
        className="block rounded border p-4"
      >
        <h3 className="font-bold">{title}</h3>
        {description && <p>{description}</p>}
      </a>
    );
  }

  const className =
    intent === 'transactional'
      ? 'flex flex-col rounded border bg-blue-50 p-4'
      : intent === 'download'
        ? 'flex items-center rounded border bg-green-50 p-4'
        : 'flex flex-col rounded border bg-gray-50 p-4';

  return (
    <a href={url} onClick={handleClick} data-layout={intent} className={className}>
      <h3 className="font-bold">{title}</h3>
      {description && <p>{description}</p>}
    </a>
  );
}
