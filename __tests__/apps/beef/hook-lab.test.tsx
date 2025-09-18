import { act, fireEvent, render, screen, within } from '@testing-library/react';
import BeefPage from '../../../apps/beef';

describe('BeEF sandbox hook lab', () => {
  const dispatchHookMessage = (stage: string, message?: string) => {
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: 'beef-demo', type: 'hook-status', stage, message },
        })
      );
    });
  };

  it('activates the sandbox iframe and records hook progress', () => {
    render(<BeefPage />);

    const launchButton = screen.getByRole('button', { name: /launch sandbox/i });
    fireEvent.click(launchButton);

    const status = screen.getByTestId('hook-status');
    const statusMessage = screen.getByTestId('hook-status-message');
    const logs = screen.getByTestId('hook-log');
    expect(status).toHaveTextContent(/initializing/i);
    expect(statusMessage).toHaveTextContent(/launching sandboxed target iframe/i);

    const iframe = screen.getByTitle('BeEF sandbox target');
    fireEvent.load(iframe);

    expect(statusMessage).toHaveTextContent(/waiting for hook signal/i);
    expect(within(logs).getByText(/Sandboxed target loaded locally\./i)).toBeInTheDocument();

    dispatchHookMessage('ready', 'Sandbox handshake acknowledged. Deploying local hook.');
    expect(status).toHaveTextContent(/initializing/i);
    expect(statusMessage).toHaveTextContent(/deploying local hook/i);
    expect(
      within(logs).getByText(/Sandbox handshake acknowledged\. Deploying local hook\./i)
    ).toBeInTheDocument();

    dispatchHookMessage('hooked', 'Simulated BeEF hook established locally.');
    expect(status).toHaveTextContent(/hooked/i);
    expect(within(logs).getByText(/Simulated BeEF hook established locally\./i)).toBeInTheDocument();
  });

  it('disconnect button removes the iframe and stops listening', () => {
    render(<BeefPage />);

    const launchButton = screen.getByRole('button', { name: /launch sandbox/i });
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    expect(disconnectButton).toBeDisabled();

    fireEvent.click(launchButton);
    const iframe = screen.getByTitle('BeEF sandbox target');
    fireEvent.load(iframe);
    expect(disconnectButton).not.toBeDisabled();

    fireEvent.click(disconnectButton);

    expect(screen.queryByTitle('BeEF sandbox target')).not.toBeInTheDocument();
    const status = screen.getByTestId('hook-status');
    const statusMessage = screen.getByTestId('hook-status-message');
    expect(status).toHaveTextContent(/disconnected/i);
    expect(statusMessage).toHaveTextContent(/ready to reconnect/i);
    expect(disconnectButton).toBeDisabled();

    dispatchHookMessage('hooked', 'Message should be ignored');
    expect(status).toHaveTextContent(/disconnected/i);
    expect(statusMessage).toHaveTextContent(/ready to reconnect/i);
  });
});
