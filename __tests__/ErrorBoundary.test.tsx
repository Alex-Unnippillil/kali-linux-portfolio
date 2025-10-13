import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from '../components/core/ErrorBoundary';
import { reportClientError } from '../lib/client-error-reporter';
import { captureClientException } from '../lib/monitoring/sentry';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('../lib/client-error-reporter', () => ({
  reportClientError: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/monitoring/sentry', () => ({
  captureClientException: jest.fn(),
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
  const mockedReportClientError = reportClientError as jest.MockedFunction<typeof reportClientError>;
  const mockedCaptureClientException = captureClientException as jest.MockedFunction<typeof captureClientException>;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedReportClientError.mockClear();
    mockedCaptureClientException.mockClear();
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
    expect(mockedCaptureClientException).toHaveBeenCalled();
    expect(mockedReportClientError).toHaveBeenCalled();
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
});

