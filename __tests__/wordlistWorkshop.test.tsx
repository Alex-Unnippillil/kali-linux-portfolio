import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import WordlistWorkshop from '../apps/wordlist-workshop';

describe('WordlistWorkshop', () => {
  it('estimates and generates combinations', () => {
    const { getByLabelText, getByText, getByTestId } = render(<WordlistWorkshop />);
    fireEvent.change(getByLabelText(/Base words/i), { target: { value: 'a' } });
    fireEvent.click(getByLabelText(/Case permutations/i));
    fireEvent.click(getByLabelText(/Leet substitutions/i));
    fireEvent.click(getByLabelText(/Append numbers/i));
    fireEvent.change(getByLabelText(/Max number/i), { target: { value: '1' } });
    expect(getByTestId('estimate').textContent).toMatch('12');
    fireEvent.click(getByText('Generate'));
    const value = (getByTestId('output') as HTMLTextAreaElement).value.trim();
    expect(value.split('\n')).toHaveLength(12);
  });
});
