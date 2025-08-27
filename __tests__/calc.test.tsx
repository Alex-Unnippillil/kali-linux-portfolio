import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Calc from '../components/apps/calc';

describe('Calc component', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('evaluates expressions correctly', () => {
    const { getByText, getByTestId } = render(<Calc />);
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('='));
    expect(getByTestId('calc-input').value).toBe('2');
  });

  it('handles invalid expressions', () => {
    const { getByText, getByTestId } = render(<Calc />);
    fireEvent.click(getByText('2'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('='));
    expect(getByTestId('calc-input').value).toBe('Invalid Expression');
  });

  it('avoids floating point errors', () => {
    const { getByText, getByTestId } = render(<Calc />);
    // Enter 1.1 + 2.2
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('.'));
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('2'));
    fireEvent.click(getByText('.'));
    fireEvent.click(getByText('2'));
    fireEvent.click(getByText('='));
    expect(getByTestId('calc-input').value).toBe('3.3');
  });

  it('Enter key triggers evaluation', () => {
    const { getByTestId } = render(<Calc />);
    const input = getByTestId('calc-input');
    fireEvent.change(input, { target: { value: '1+1' } });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(input.value).toBe('2');
  });

  it('history is capped at 10 entries', () => {
    const { getByText, getByTestId } = render(<Calc />);
    const equals = getByText('=');
    const input = getByTestId('calc-input');
    for (let i = 0; i < 11; i++) {
      fireEvent.change(input, { target: { value: String(i) } });
      fireEvent.click(equals);
    }
    fireEvent.click(getByText('History'));
    const panel = getByTestId('history-panel');
    expect(panel.children.length).toBe(10);
    expect(JSON.parse(window.localStorage.getItem('calcHistory') || '[]').length).toBe(10);
  });
});

