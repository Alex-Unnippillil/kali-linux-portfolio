import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from '../components/core/ErrorBoundary';


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
});
