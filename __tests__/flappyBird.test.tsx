import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts the game with default skins', async () => {
    render(<FlappyBird />);
    fireEvent.click(screen.getAllByText('Start')[0]);
    expect(await screen.findByText('Score: 0')).toBeInTheDocument();
  });

  it('starts the game with alternate skins', async () => {
    render(<FlappyBird />);
    fireEvent.change(screen.getByLabelText('Bird Skin'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Pipe Skin'), { target: { value: '1' } });
    fireEvent.click(screen.getAllByText('Start')[0]);
    expect(await screen.findByText('Score: 0')).toBeInTheDocument();
  });

  it('loads persisted high score for the selected difficulty', async () => {
    window.localStorage.setItem(
      'flappy-bird:high-scores',
      JSON.stringify({ easy: 2, normal: 7, hard: 1 }),
    );
    render(<FlappyBird />);
    fireEvent.click(screen.getAllByText('Start')[0]);
    expect(await screen.findByText('High: 7')).toBeInTheDocument();
  });
});
