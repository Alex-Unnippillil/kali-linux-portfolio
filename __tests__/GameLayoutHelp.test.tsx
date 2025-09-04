import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameLayout from '../components/apps/GameLayout';

describe('GameLayout help overlay shortcut', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('seen_tutorial_2048', '1');
    window.localStorage.removeItem('keymap');
  });

  it('opens help overlay when pressing the shortcut', () => {
    render(
      <GameLayout gameId="2048">
        <div>game</div>
      </GameLayout>
    );
    expect(screen.queryByText('2048 Help')).toBeNull();
    fireEvent.keyDown(window, { key: 'F1' });
    expect(screen.getByText('2048 Help')).toBeInTheDocument();
  });
});
