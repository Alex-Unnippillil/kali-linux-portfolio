import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
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

  it('performs scientific operations', () => {
    const { getByText, getByLabelText, getByTestId } = render(<Calc />);

    fireEvent.click(getByText('Sci'));

    // Percent: 50 -> 0.5
    fireEvent.click(getByText('5'));
    fireEvent.click(getByText('0'));
    fireEvent.click(getByLabelText('percent'));
    expect(getByTestId('calc-display').textContent).toBe('0.5');

    // Clear display
    fireEvent.click(getByLabelText('clear'));

    // Square root: √9 -> 3
    fireEvent.click(getByText('9'));
    fireEvent.click(getByLabelText('square root'));
    expect(getByTestId('calc-display').textContent).toBe('3');

    // Clear display
    fireEvent.click(getByLabelText('clear'));

    // Square: 3² -> 9
    fireEvent.click(getByText('3'));
    fireEvent.click(getByLabelText('square'));
    expect(getByTestId('calc-display').textContent).toBe('9');

    // Clear display
    fireEvent.click(getByLabelText('clear'));

    // Reciprocal: 2 -> 0.5
    fireEvent.click(getByText('2'));
    fireEvent.click(getByLabelText('reciprocal'));
    expect(getByTestId('calc-display').textContent).toBe('0.5');

    // Clear display
    fireEvent.click(getByLabelText('clear'));

    // Toggle sign: 5 -> -5
    fireEvent.click(getByText('5'));
    fireEvent.click(getByLabelText('toggle sign'));
    expect(getByTestId('calc-display').textContent).toBe('-5');
  });

  it('stores results in history and can clear them', async () => {
    window.localStorage.clear();
    const { getByText, getByLabelText, queryByText } = render(<Calc />);
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('+'));
    fireEvent.click(getByText('1'));
    fireEvent.click(getByText('='));
    expect(getByText('1+1 = 2')).toBeInTheDocument();
    fireEvent.click(getByLabelText('clear history'));
    await waitFor(() => expect(queryByText('1+1 = 2')).toBeNull());
  });
});
