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
      <Tape entries={[{ expr: '1+1', result: '2' }]} onClear={jest.fn()} />,
    );
    fireEvent.click(getByLabelText('Use result 2 from 1+1'));
    const display = document.getElementById('display') as HTMLInputElement;
    expect(display.value).toBe('2');
  });

  it('copies result to clipboard', async () => {
    const { getByLabelText } = render(
      <Tape entries={[{ expr: '1+1', result: '2' }]} onClear={jest.fn()} />,
    );
    fireEvent.click(getByLabelText('Copy result 2 to clipboard'));
    await waitFor(() =>
      expect((navigator.clipboard as any).writeText).toHaveBeenCalledWith('2'),
    );
  });

  it('clears the tape when requested', () => {
    const handleClear = jest.fn();
    const { getByText } = render(
      <Tape entries={[{ expr: '2+2', result: '4' }]} onClear={handleClear} />,
    );
    fireEvent.click(getByText('Clear'));
    expect(handleClear).toHaveBeenCalled();
  });
});
