import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from '../components/core/ErrorBoundary';

jest.mock('../lib/analytics-client', () => ({
  trackEvent: jest.fn(),
}));

interface ProblemChildProps {
  shouldThrow?: boolean;
}

const ProblemChild = ({ shouldThrow }: ProblemChildProps) => {
  if (shouldThrow) {
    throw new Error('Boom');
  }

  return <p>All good</p>;
};

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  it('renders fallback UI when an error is thrown', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
    expect(screen.getByText(/please refresh/i)).toBeInTheDocument();
  });

  it('recovers and renders children again when they change after an error', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('offers offline recovery actions for network failures', () => {
    const { trackEvent } = require('../lib/analytics-client') as {
      trackEvent: jest.Mock;
    };
    trackEvent.mockClear();

    const fallbackEvents: CustomEvent[] = [];
    const recordEvent = (event: Event) => {
      fallbackEvents.push(event as CustomEvent);
    };
    window.addEventListener('offline:fallback-open', recordEvent);

    const storagePrototype = Object.getPrototypeOf(window.localStorage);
    const setItemSpy = jest.spyOn(storagePrototype, 'setItem');

    const NetworkProblem = () => {
      throw new TypeError('Failed to fetch');
    };

    try {
      render(
        <ErrorBoundary>
          <NetworkProblem />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/could not reach the network/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      fireEvent.click(screen.getByRole('button', { name: /open cached/i }));
      expect(trackEvent).toHaveBeenCalledWith('offline_fallback_used', {
        source: 'error-boundary',
        path: '/offline.html',
      });
      expect(setItemSpy).toHaveBeenCalledWith(
        'offlineFallbackUsed',
        expect.stringContaining('error-boundary'),
      );
      expect(fallbackEvents).not.toHaveLength(0);
      expect(fallbackEvents[fallbackEvents.length - 1]?.detail).toEqual({
        source: 'error-boundary',
        path: '/offline.html',
        ts: expect.any(Number),
      });
    } finally {
      setItemSpy.mockRestore();
      window.removeEventListener('offline:fallback-open', recordEvent);
    }
  });
});

