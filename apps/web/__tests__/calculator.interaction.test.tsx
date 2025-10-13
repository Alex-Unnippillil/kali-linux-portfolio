import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { all, create } from 'mathjs';
import Calculator from '../apps/calculator';

const math = create(all);

describe('Calculator summary status', () => {
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
});

