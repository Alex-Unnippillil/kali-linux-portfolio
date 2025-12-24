import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ErrorPageContent } from '../components/core/ErrorPageContent';
import { reportClientError } from '../lib/client-error-reporter';

jest.mock('../lib/client-error-reporter');

const mockedReportClientError = reportClientError as jest.MockedFunction<typeof reportClientError>;

describe('ErrorPageContent', () => {
  const error = new Error('Boom');
  const reset = jest.fn();

  beforeEach(() => {
    mockedReportClientError.mockClear();
    Object.defineProperty(window.navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the provided correlation ID', () => {
    render(
      <ErrorPageContent
        error={error}
        reset={reset}
        correlationId="test-correlation-id"
        bugReportUrl="https://example.com/bug"
      />,
    );

    expect(screen.getByText(/Correlation ID/)).toHaveTextContent('test-correlation-id');
    expect(mockedReportClientError).toHaveBeenCalledWith(error, error.stack, 'test-correlation-id');
  });

  it('copies the correlation ID to the clipboard', async () => {
    render(
      <ErrorPageContent
        error={error}
        reset={reset}
        correlationId="copy-me"
        bugReportUrl="https://example.com/bug"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /copy error id/i }));

    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith('copy-me');
    });

    expect(await screen.findByText(/Correlation ID copied to clipboard/i)).toBeInTheDocument();
  });
});
