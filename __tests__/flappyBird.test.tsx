import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FlappyBird from '../components/apps/flappy-bird';

beforeAll(() => {
  // Minimal ResizeObserver mock for the test environment
  // @ts-ignore
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('FlappyBird', () => {
  it('starts the game with default skins', async () => {
    render(<FlappyBird />);
    fireEvent.click(screen.getByText('Start'));
    expect(await screen.findByText('Get Ready')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(await screen.findByText('Score: 0')).toBeInTheDocument();
  });

  it('starts the game with alternate skins', async () => {
    render(<FlappyBird />);
    fireEvent.change(screen.getByLabelText('Bird Skin'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Pipe Skin'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Start'));
    expect(await screen.findByText('Get Ready')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(await screen.findByText('Score: 0')).toBeInTheDocument();
  });

  it('shows settings controls in the menu overlay', () => {
    render(<FlappyBird />);
    expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
    expect(screen.getByLabelText('Practice mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Ghost run')).toBeInTheDocument();
  });

  it('toggles the settings panel from the toolbar', async () => {
    render(<FlappyBird />);
    fireEvent.click(screen.getByText('Start'));
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    const settingsButton = await screen.findByRole('button', { name: 'Settings' });
    fireEvent.click(settingsButton);
    expect(await screen.findByText('Controls')).toBeInTheDocument();
  });

  it('pauses via the toolbar hotkey', async () => {
    render(<FlappyBird />);
    fireEvent.click(screen.getByText('Start'));
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    fireEvent.keyDown(window, { key: 'Escape' });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Resume')).toBeInTheDocument();
  });
});
