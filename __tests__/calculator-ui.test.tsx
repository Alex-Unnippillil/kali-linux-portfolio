import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Calculator from '../apps/calculator';

describe('calculator ui', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('keypad and equals update history', () => {
    render(<Calculator />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /equals/i }));
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByText(/1\+1/)).toBeInTheDocument();
  });

  test('mode and base switching', () => {
    render(<Calculator />);
    fireEvent.change(screen.getByLabelText(/calculator mode/i), { target: { value: 'programmer' } });
    fireEvent.change(screen.getByLabelText(/number base/i), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: /equals/i }));
    expect(screen.getByDisplayValue('A')).toBeInTheDocument();
  });

  test('undo redo and errors', () => {
    render(<Calculator />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByText('Undo'));
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Redo'));
    expect(screen.getByDisplayValue('1+')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /equals/i }));
    expect(screen.getByRole('status').textContent?.toLowerCase()).toContain('error');
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByRole('status')).not.toHaveTextContent(/error/i);
  });
});
