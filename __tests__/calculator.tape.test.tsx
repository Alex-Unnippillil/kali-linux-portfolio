import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Tape from '../apps/calculator/components/Tape';

describe('Calculator Tape', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="display" />';
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it('recalls result to display', () => {
    const { getByLabelText } = render(
      <Tape entries={[{ expr: '1+1', result: '2' }]} />,
    );
    fireEvent.click(getByLabelText('recall result'));
    const display = document.getElementById('display') as HTMLInputElement;
    expect(display.value).toBe('2');
  });

  it('copies result to clipboard', async () => {
    const { getByLabelText } = render(
      <Tape entries={[{ expr: '1+1', result: '2' }]} />,
    );
    fireEvent.click(getByLabelText('copy result'));
    await waitFor(() =>
      expect((navigator.clipboard as any).writeText).toHaveBeenCalledWith('2'),
    );
  });
});
