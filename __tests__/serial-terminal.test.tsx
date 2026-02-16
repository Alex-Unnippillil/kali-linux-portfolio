import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SerialTerminalApp from '../components/apps/serial-terminal';

describe('SerialTerminalApp', () => {
  it('shows enhanced terminal controls even when serial is unsupported', () => {
    render(<SerialTerminalApp />);

    expect(screen.getByRole('button', { name: /connect/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /clear output/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/baud/i)).toHaveValue('9600');
    expect(screen.getByLabelText(/auto-scroll/i)).toBeChecked();
    expect(screen.getByText(/bytes received: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/web serial api not supported/i)).toBeInTheDocument();
  });

  it('allows changing baud rate while disconnected', async () => {
    const user = userEvent.setup();
    render(<SerialTerminalApp />);

    await user.selectOptions(screen.getByLabelText(/baud/i), '115200');

    expect(screen.getByText(/baud: 115200/i)).toBeInTheDocument();
  });
});
