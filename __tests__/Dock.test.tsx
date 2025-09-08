import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dock from '../src/components/desktop/Dock';

test('renders dock icons and toggles running indicator', () => {
  render(<Dock />);

  const terminalBtn = screen.getByRole('button', { name: /Terminal/i });
  const browserBtn = screen.getByRole('button', { name: /Browser/i });
  const filesBtn = screen.getByRole('button', { name: /Files/i });

  expect(terminalBtn).toBeInTheDocument();
  expect(browserBtn).toBeInTheDocument();
  expect(filesBtn).toBeInTheDocument();

  expect(screen.queryByTestId('indicator-terminal')).toBeNull();
  fireEvent.click(terminalBtn);
  expect(screen.getByTestId('indicator-terminal')).toBeInTheDocument();
  fireEvent.click(terminalBtn);
  expect(screen.queryByTestId('indicator-terminal')).toBeNull();
});
