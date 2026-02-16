import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { all, create } from 'mathjs';
import Calculator from '../apps/calculator';

const math = create(all);

describe('Calculator interactions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (globalThis as any).math = math;
  });

  it('updates the summary region when history changes', async () => {
    render(<Calculator />);

    const display = await screen.findByLabelText('Calculator display');
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(display, { target: { value: '1+1' } });
    fireEvent.click(screen.getByRole('button', { name: /equals/i }));

    await waitFor(() => {
      expect(screen.getByTestId('calc-summary-history')).toHaveTextContent('1+1 = 2');
    });
  });

  it('toggles the keyboard shortcuts helper with the ? key', async () => {
    render(<Calculator />);

    expect(await screen.findByText('Evaluate expression')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: '?', code: 'Slash', shiftKey: true });

    await waitFor(() => {
      expect(screen.queryByText('Evaluate expression')).not.toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: '?', code: 'Slash', shiftKey: true });

    await waitFor(() => {
      expect(screen.getByText('Evaluate expression')).toBeInTheDocument();
    });
  });

  it('loads a history expression back into the display when selected', async () => {
    render(<Calculator />);

    const display = await screen.findByLabelText('Calculator display');
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(display, { target: { value: '7*6' } });
    fireEvent.click(screen.getByRole('button', { name: /equals/i }));

    await waitFor(() => {
      expect(screen.getByTestId('calc-summary-history')).toHaveTextContent('7*6 = 42');
    });

    fireEvent.click(screen.getByRole('button', { name: /toggle history/i }));

    const historyEntry = await screen.findByRole('button', { name: /load 7\*6 from history/i });
    fireEvent.click(historyEntry);

    expect(display).toHaveValue('7*6');
    expect(screen.getByTestId('calc-status-message')).toHaveTextContent('Loaded "7*6" from tape.');
  });
});
