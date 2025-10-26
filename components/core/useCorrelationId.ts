'use client';

import { useEffect, useState } from 'react';

interface CorrelationIdState {
  correlationId: string | null;
  isLoading: boolean;
  hasError: boolean;
}

async function requestCorrelationId(): Promise<string> {
  const response = await fetch('/api/correlation-id', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch correlation ID: ${response.status}`);
  }

  const { correlationId } = (await response.json()) as { correlationId: string };
  if (!correlationId) {
    throw new Error('Correlation ID missing in response');
  }

  return correlationId;
}

export function useCorrelationId(): CorrelationIdState {
  const [state, setState] = useState<CorrelationIdState>({
    correlationId: null,
    isLoading: true,
    hasError: false,
  });

  useEffect(() => {
    let active = true;

    requestCorrelationId()
      .then((id) => {
        if (active) {
          setState({ correlationId: id, isLoading: false, hasError: false });
        }
      })
      .catch((error) => {
        console.error('Failed to request correlation ID', error);
        if (active) {
          setState({ correlationId: null, isLoading: false, hasError: true });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
