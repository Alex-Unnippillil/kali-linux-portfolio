import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from '../components/core/ErrorBoundary';
import { logEvent } from '../utils/analytics';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('../utils/analytics', () => ({ logEvent: jest.fn() }));

const mockedLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;

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
    mockedLogEvent.mockClear();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  it('renders fallback UI when an error is thrown', async () => {
    const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong.');
    expect(alert).toHaveTextContent('Try the action again or review the logs for more details.');
    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });
    expect(focusSpy.mock.instances).toContain(alert);
    focusSpy.mockRestore();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view logs/i })).toHaveAttribute(
      'href',
      'https://unnippillil.com/test-log'
    );
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

  it('allows retrying after an error is shown', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

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

  it('logs analytics when the log link is activated', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('link', { name: /view logs/i }));

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'error_boundary', action: 'view_logs' })
    );
  });
});

