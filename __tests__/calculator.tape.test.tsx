import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Tape from '../apps/calculator/components/Tape';

test('tape recall works', () => {
  const onRecall = jest.fn();
  render(<Tape entries={[{ expr: '1+1', result: '2' }]} onRecall={onRecall} />);
  fireEvent.click(screen.getByLabelText(/recall result/i));
  expect(onRecall).toHaveBeenCalledWith('2');
});
