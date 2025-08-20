import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Calc from '../components/apps/calc';

describe('Calc component', () => {
  it('evaluates expressions correctly', () => {
    const { container } = render(<Calc />);
    const input = container.querySelector('#calculator-input-2') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '1+1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    const result = container.querySelector('#row-calculator-result-2');
    expect(result?.textContent).toBe('2');
  });

  it('handles invalid expressions', () => {
    const { container } = render(<Calc />);
    const input = container.querySelector('#calculator-input-2') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '2++' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    const result = container.querySelector('#row-calculator-result-2');
    expect(result?.textContent).toBe('Invalid Expression');
  });
});
