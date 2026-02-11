import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Calculator from '../apps/calculator';

test('formula editor saves and inserts formula', () => {
  render(<Calculator />);
  fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'double' } });
  fireEvent.change(screen.getByPlaceholderText('Expression'), { target: { value: '2*2' } });
  fireEvent.click(screen.getByRole('button', { name: /save formula/i }));
  fireEvent.click(screen.getByRole('button', { name: /double/i }));
  expect(screen.getByDisplayValue('2*2')).toBeInTheDocument();
});
