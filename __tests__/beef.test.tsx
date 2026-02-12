import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Beef from '../components/apps/beef';

describe('BeEF app', () => {
  test('advances through lab steps to payload builder', () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // move through sandbox, simulated hook and demo module steps
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/Payload Builder/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Payloads run locally in a sandbox and never touch the network./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  test('can reset lab back to disclaimer', () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // advance to final step
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    fireEvent.click(screen.getByRole('button', { name: /reset lab/i }));
    expect(screen.getByText(/Disclaimer/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Use these security tools only in environments where you have explicit authorization./i)
    ).toBeInTheDocument();
  });

  test('handles hook connection lifecycle', async () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));

    expect(screen.getByText(/Hook status:/i)).toHaveTextContent(/Disconnected/i);

    fireEvent.click(screen.getByRole('button', { name: /connect hook/i }));

    await screen.findByText(/Connected/i);
    expect(screen.getByText(/Hook status:/i)).toHaveTextContent(/Connected/i);

    const firstSandbox = screen.getByTitle('sandbox');

    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));

    expect(screen.queryByTitle('sandbox')).toBeNull();
    expect(screen.getByText(/Hook status:/i)).toHaveTextContent(/Disconnected/i);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: 'sandboxed-target', type: 'sandbox-ready' },
        })
      );
    });

    expect(screen.getByText(/Hook status:/i)).toHaveTextContent(/Disconnected/i);

    fireEvent.click(screen.getByRole('button', { name: /connect hook/i }));

    await screen.findByText(/Connected/i);
    expect(screen.getByText(/Hook status:/i)).toHaveTextContent(/Connected/i);

    const secondSandbox = screen.getByTitle('sandbox');

    expect(secondSandbox).not.toBe(firstSandbox);
    expect(screen.getByText(/Hook status:/i)).toHaveTextContent(/Connected/i);
  });
});
