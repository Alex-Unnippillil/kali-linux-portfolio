import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ErrorFixSuggestions from '@/components/ui/ErrorFixSuggestions';

jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

describe('ErrorFixSuggestions', () => {
  const trackMock = require('@vercel/analytics').track as jest.Mock;
  const writeText = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    trackMock.mockReset();
    writeText.mockClear();
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });
  });

  it('renders suggestions for known codes', () => {
    render(<ErrorFixSuggestions codes={["SIM-001"]} />);

    expect(screen.getByText('SIM-001')).toBeInTheDocument();
    expect(
      screen.getByText(/truncated or incomplete log sample/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/scp lab@10.0.5.20:\/var\/log\/simulations\/latest.log/),
    ).toBeInTheDocument();
  });

  it('copies commands and tracks analytics when Copy is pressed', async () => {
    render(<ErrorFixSuggestions codes={["SIM-001"]} source="test-source" />);

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('scp lab@10.0.5.20');
    expect(trackMock).toHaveBeenCalledWith('error_fix_copy', {
      code: 'SIM-001',
      source: 'test-source',
    });
  });

  it('runs commands and tracks analytics when Run is pressed', () => {
    const onRun = jest.fn();
    render(
      <ErrorFixSuggestions
        codes={["SIM-001"]}
        onRunCommand={onRun}
        source="test-source"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /run/i }));

    expect(onRun).toHaveBeenCalledWith(
      expect.stringContaining('scp lab@10.0.5.20'),
      'SIM-001',
    );
    expect(trackMock).toHaveBeenCalledWith('error_fix_run', {
      code: 'SIM-001',
      source: 'test-source',
    });
  });
});
