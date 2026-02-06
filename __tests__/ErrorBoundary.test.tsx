import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    // @ts-expect-error cleanup clipboard mock
    delete navigator.clipboard;
  });

  it('renders fallback UI with diagnostics when an error is thrown', async () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /likely cause/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /copy diagnostics/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/copy diagnostics/i);
    expect(screen.getByLabelText('Diagnostic details')).toBeInTheDocument();
  });

  it('copies diagnostics to the clipboard and announces status', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    const copyButton = await screen.findByRole('button', { name: /copy diagnostics/i });
    await userEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const payload = writeText.mock.calls[0][0];
    expect(payload).toContain('permissions');
    expect(payload).not.toContain('password');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/copied to clipboard/i);
    });
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
