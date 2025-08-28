import { fireEvent, render, screen } from '@testing-library/react';
import CommandPalette from '../components/CommandPalette';

test('opens and runs app from command palette', () => {
  const openApp = jest.fn();
  const apps = [{ id: 'terminal', title: 'Terminal' }];
  render(<CommandPalette openApp={openApp} apps={apps} />);

  fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
  const input = screen.getByPlaceholderText('Search...');
  fireEvent.change(input, { target: { value: 'terminal' } });
  fireEvent.keyDown(window, { key: 'Enter' });

  expect(openApp).toHaveBeenCalledWith('terminal');
});
