import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Calc from '@components/apps/calc';

describe('Calc component', () => {
  it('evaluates expressions correctly', () => {
    const { getByText, getByTestId } = render(<Calc />);
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('='));
    expect(getByTestId('calc-display').textContent).toBe('2');
  });

  it('handles invalid expressions', () => {
    const { getByText, getByTestId } = render(<Calc />);
    fireEvent.click(getByText('2'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('='));
    expect(getByTestId('calc-display').textContent).toBe('Invalid Expression');
  });
});

