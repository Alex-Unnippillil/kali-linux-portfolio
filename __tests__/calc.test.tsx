import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Calc from '../components/apps/calc';

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

  it('logs to tape and supports memory functions', () => {
    const { getByText, getByTestId } = render(<Calc />);
    fireEvent.click(getByText('5'));
    fireEvent.click(getByText('M+'));
    fireEvent.click(getByText('C'));
    fireEvent.click(getByText('MR'));
    expect(getByTestId('calc-display').textContent).toBe('5');

    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('='));
    expect(getByTestId('calc-tape').textContent).toContain('5+1 = 6');
  });

  it('handles keyboard input', () => {
    const { getByTestId } = render(<Calc />);
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '+' });
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(getByTestId('calc-display').textContent).toBe('2');
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(getByTestId('calc-display').textContent).toBe('');
  });
});

