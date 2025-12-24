'use client';

import ErrorPageContent from '../components/core/ErrorPageContent';
import { useCorrelationId } from '../components/core/useCorrelationId';

const BUG_REPORT_BASE = 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/issues/new';

function buildBugReportUrl(correlationId: string) {
  const url = new URL(BUG_REPORT_BASE);
  url.searchParams.set('title', 'Bug report');
  url.searchParams.set(
    'body',
    `Please describe what happened.\n\nCorrelation ID: ${correlationId}\n\nSteps to reproduce:\n- `,
  );
  url.searchParams.set('labels', 'bug');
  return url.toString();
}

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { correlationId, isLoading, hasError } = useCorrelationId();
  const bugReportUrl = correlationId ? buildBugReportUrl(correlationId) : undefined;

  return (
    <ErrorPageContent
      error={error}
      reset={reset}
      correlationId={correlationId}
      bugReportUrl={bugReportUrl}
      isLoading={isLoading}
      loadError={hasError}
    />
  );
}
