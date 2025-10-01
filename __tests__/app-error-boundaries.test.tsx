import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppError from '../app/error';
import GlobalError from '../app/global-error';
import { reportClientError } from '../lib/client-error-reporter';
import { NetworkError, ParseError, PermissionError } from '../lib/error-taxonomy';

jest.mock('../lib/client-error-reporter', () => ({
  reportClientError: jest.fn().mockResolvedValue(undefined),
}));

describe('Next.js app error boundary', () => {
  const reset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    reset.mockClear();
  });

  it('renders network guidance and retries without reload', async () => {
    render(<AppError error={new NetworkError('Network offline')} reset={reset} />);

    expect(screen.getByRole('heading', { name: /connection hiccup/i })).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryButton);
    expect(reset).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(reportClientError).toHaveBeenCalledWith(expect.any(NetworkError), expect.objectContaining({
        category: 'network',
        retryable: true,
      }));
    });
  });

  it('offers parse recovery messaging', async () => {
    render(<AppError error={new ParseError('Unexpected token at 1')} reset={reset} />);

    expect(screen.getByRole('heading', { name: /data could not be processed/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reset view/i }));
    expect(reset).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(reportClientError).toHaveBeenCalledWith(expect.any(ParseError), expect.objectContaining({
        category: 'parse',
        retryable: true,
      }));
    });
  });

  it('surfaces permission guidance', async () => {
    render(<AppError error={new PermissionError('Permission denied')} reset={reset} />);

    expect(screen.getByRole('heading', { name: /permission required/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry with permissions/i }));
    expect(reset).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(reportClientError).toHaveBeenCalledWith(expect.any(PermissionError), expect.objectContaining({
        category: 'permission',
        retryable: false,
      }));
    });
  });
});

describe('Next.js global error boundary', () => {
  const reset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    reset.mockClear();
  });

  it('renders within the document shell and retries', async () => {
    render(<GlobalError error={new NetworkError('Lost connection')} reset={reset} />);

    expect(screen.getByRole('heading', { name: /connection hiccup/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry request/i }));
    expect(reset).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(reportClientError).toHaveBeenCalledWith(expect.any(NetworkError), expect.objectContaining({
        category: 'network',
        retryable: true,
      }));
    });
  });
});
