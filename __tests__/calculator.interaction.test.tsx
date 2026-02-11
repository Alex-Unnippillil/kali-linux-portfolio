import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Calculator from '../apps/calculator';

test('status region announces mode changes', () => {
  render(<Calculator />);
  fireEvent.change(screen.getByLabelText(/calculator mode/i), { target: { value: 'scientific' } });
  expect(screen.getByRole('status')).toHaveTextContent(/scientific/i);
});
