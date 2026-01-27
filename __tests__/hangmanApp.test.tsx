import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Hangman from '../components/apps/hangman';

if (typeof ResizeObserver === 'undefined') {
  // @ts-ignore
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe('Hangman app', () => {
  test('imports a custom list and starts a game', () => {
    window.localStorage.clear();
    render(<Hangman />);
    const textarea = screen.getByLabelText('Custom word list');
    fireEvent.change(textarea, { target: { value: 'red moon' } });

    fireEvent.click(screen.getByRole('button', { name: 'Import list' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play custom' }));

    expect(screen.getByTestId('hangman-phrase')).toHaveTextContent('___ ____');
  });
});
