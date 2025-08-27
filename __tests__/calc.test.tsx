import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Calc from '../components/apps/calc';

describe('Calc component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('evaluates decimals precisely', () => {
    const { getByText, getByTestId } = render(<Calc />);
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('.'));
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('2'));
    fireEvent.click(getByText('.'));
    fireEvent.click(getByText('2'));
    fireEvent.click(getByText('='));
    expect(getByTestId('calc-display').textContent).toBe('3.3');
  });

  it('evaluates with Enter key', () => {
    const { getByTestId } = render(<Calc />);
    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: '+' });
    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(getByTestId('calc-display').textContent).toBe('2');
  });

  it('caps history at 10 entries', () => {
    const { getByText } = render(<Calc />);
    for (let i = 0; i < 11; i++) {
      fireEvent.click(getByText('1'));
      fireEvent.click(getByText('+'));
      fireEvent.click(getByText('1'));
      fireEvent.click(getByText('='));
      fireEvent.click(getByText('C'));
    }
    fireEvent.click(getByText('History'));
    expect(JSON.parse(localStorage.getItem('calc-history') || '[]')).toHaveLength(10);
  });
});

