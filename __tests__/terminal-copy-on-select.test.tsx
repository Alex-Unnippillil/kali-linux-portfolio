import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import Terminal from '../apps/terminal/components/Terminal';
import useToast from '../hooks/useToast';

jest.mock('../hooks/useToast');

describe('Terminal copy on select', () => {
  const toast = jest.fn();
  beforeEach(() => {
    (useToast as jest.Mock).mockReturnValue(toast);
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    toast.mockClear();
  });

  it('shows copy button on text selection and copies to clipboard', async () => {
    const { getByTestId, getByRole, queryByRole } = render(
      <Terminal>hello world</Terminal>,
    );
    const container = getByTestId('xterm-container');
    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseUp(container);

    const button = getByRole('button', { name: /copy/i });
    fireEvent.click(button);

    await Promise.resolve();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world');
    expect(toast).toHaveBeenCalledWith('Copied to clipboard');
    await waitFor(() =>
      expect(queryByRole('button', { name: /copy/i })).toBeNull(),
    );
  });

  it('supports long press on touch devices', () => {
    jest.useFakeTimers();
    const { getByTestId, getByRole } = render(
      <Terminal>touch text</Terminal>,
    );
    const container = getByTestId('xterm-container');
    fireEvent.touchStart(container, {
      touches: [{ clientX: 0, clientY: 0 }],
    });

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const button = getByRole('button', { name: /copy/i });
    expect(button).toBeInTheDocument();
    jest.useRealTimers();
  });
});
