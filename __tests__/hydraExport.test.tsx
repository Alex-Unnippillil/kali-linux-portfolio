import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HydraApp from '../components/apps/hydra';

describe('Hydra config export redaction', () => {
  let writeTextMock: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'hydraUserLists',
      JSON.stringify([
        {
          name: 'corp-users.txt',
          content: 'alice@example.com\nengineer\n',
        },
      ])
    );
    localStorage.setItem(
      'hydraPassLists',
      JSON.stringify([
        {
          name: 'corp-pass.txt',
          content: 'Summer2024!\nP@ssword',
        },
      ])
    );

    writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    // jsdom does not implement getContext; provide a lightweight mock
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
    }));

    window.requestAnimationFrame =
      window.requestAnimationFrame ||
      (((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      }) as typeof window.requestAnimationFrame);
  });

  it('redacts sensitive fields when copying configuration', async () => {
    render(<HydraApp />);

    await screen.findByRole('option', { name: 'corp-users.txt' });

    const targetInput = screen.getByPlaceholderText('192.168.0.1');
    fireEvent.change(targetInput, { target: { value: '203.0.113.10:22' } });

    await screen.findByText(/exported configs will replace it with <redacted>/i);

    const copyButton = screen.getByText(/copy config/i);
    await act(async () => {
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    const exportPayload = JSON.parse(writeTextMock.mock.calls[0][0]);
    expect(exportPayload).toMatchObject({
      target: '<redacted>',
      selectedUser: '<redacted>',
      selectedPass: '<redacted>',
    });
  });
});
