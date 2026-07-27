import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DecompileView from '../apps/ghidra/components/DecompileView';

describe('Ghidra DecompileView (Next app)', () => {
  test('renaming a symbol updates all references', () => {
    render(<DecompileView />);

    fireEvent.click(screen.getByRole('button', { name: 'helper' }));

    const input = screen.getByLabelText(/rename symbol/i);
    fireEvent.change(input, { target: { value: 'assist' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(screen.getByRole('button', { name: 'assist' })).toBeInTheDocument();
    expect(screen.getAllByText(/call assist/i).length).toBeGreaterThanOrEqual(1);
  });

  test('search highlights and navigates matches', () => {
    render(<DecompileView />);

    const search = screen.getByPlaceholderText(/search decompiled code/i);
    fireEvent.change(search, { target: { value: 'call' } });

    const highlights = screen.getAllByTestId('search-highlight');
    expect(highlights.length).toBeGreaterThanOrEqual(2);
    const initialActive = highlights.find((el) => el.dataset.current === 'true');
    expect(initialActive).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /next match/i }));
    const updatedHighlights = screen.getAllByTestId('search-highlight');
    const newActive = updatedHighlights.find((el) => el.dataset.current === 'true');
    expect(newActive).toBeDefined();
    expect(newActive).not.toBe(initialActive);

    fireEvent.click(screen.getByRole('button', { name: /previous match/i }));
    const finalHighlights = screen.getAllByTestId('search-highlight');
    const finalActive = finalHighlights.find((el) => el.dataset.current === 'true');
    expect(finalActive).toBeDefined();
    expect(finalActive?.textContent?.toLowerCase()).toContain('call');
  });
});
