import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TerminalOutput from '../components/TerminalOutput';

describe('TerminalOutput copy interactions', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalClipboard) {
      Object.assign(navigator, { clipboard: originalClipboard });
    } else {
      delete (navigator as Partial<Navigator>).clipboard;
    }
    jest.clearAllMocks();
  });

  it('copies full output and shows success toast', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<TerminalOutput text={'echo hello'} />);

    const copyButton = screen.getByRole('button', { name: /copy output/i });
    fireEvent.click(copyButton);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('echo hello'));
    expect(
      await screen.findByText('Copied to clipboard'),
    ).toBeInTheDocument();
  });

  it('announces unsupported clipboard API', () => {
    delete (navigator as Partial<Navigator>).clipboard;

    render(<TerminalOutput text={'ping 1.1.1.1'} />);

    fireEvent.click(screen.getByRole('button', { name: /copy output/i }));

    expect(
      screen.getByText('Clipboard copy is unavailable in this browser.'),
    ).toBeInTheDocument();
  });

  it('shows error toast when copy fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('nope'));
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<TerminalOutput text={'nmap localhost'} />);

    fireEvent.click(screen.getByRole('button', { name: /copy output/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(
      await screen.findByText('Unable to copy to clipboard.'),
    ).toBeInTheDocument();
  });
});
