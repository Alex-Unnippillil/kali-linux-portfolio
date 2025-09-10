import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlappyBird from '../components/apps/flappy-bird';

beforeAll(() => {
  // Minimal ResizeObserver mock for the test environment
  // @ts-expect-error ResizeObserver not in JSDOM
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
    expect(await screen.findByText('Score: 0')).toBeInTheDocument();
  });

  it('starts the game with alternate skins', async () => {
    render(<FlappyBird />);
    fireEvent.change(screen.getByLabelText('Bird Skin'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Pipe Skin'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Start'));
    expect(await screen.findByText('Score: 0')).toBeInTheDocument();
  });
});
