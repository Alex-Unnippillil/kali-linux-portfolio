import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import InputLab from '../apps/input-lab';

describe('InputLab expression evaluation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('evaluates expressions with functions and operators', () => {
    render(<InputLab />);
    const input = screen.getByLabelText('Text');
    fireEvent.change(input, { target: { value: 'sqrt(9) + sin(pi / 2)' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('4');
    expect(screen.queryByText('Invalid expression')).toBeNull();
  });

  test('shows error for invalid input', () => {
    render(<InputLab />);
    const input = screen.getByLabelText('Text');
    fireEvent.change(input, { target: { value: '2++' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('Invalid expression')).toBeInTheDocument();
  });
});
