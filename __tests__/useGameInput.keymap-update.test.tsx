import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import useGameInput from '../hooks/useGameInput';

describe('useGameInput keymap updates', () => {
  const InputProbe: React.FC<{ onInput: (payload: { action: string; type: string }) => void }> = ({ onInput }) => {
    useGameInput({ game: 'pacman', onInput });
    return <div data-testid="probe" />;
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('applies keymap changes instantly after update event', () => {
    window.localStorage.setItem(
      'pacman:keymap',
      JSON.stringify({
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        action: 'Space',
        pause: 'Escape',
      }),
    );

    const onInput = jest.fn();
    render(<InputProbe onInput={onInput} />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(onInput).toHaveBeenCalledWith({ action: 'action', type: 'keydown' });

    window.localStorage.setItem(
      'pacman:keymap',
      JSON.stringify({
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        action: 'Enter',
        pause: 'Escape',
      }),
    );

    window.dispatchEvent(
      new CustomEvent('game-keymap-updated', { detail: { game: 'pacman' } }),
    );

    onInput.mockClear();

    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });
    expect(onInput).toHaveBeenCalledWith({ action: 'action', type: 'keydown' });

    onInput.mockClear();
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(onInput).not.toHaveBeenCalled();
  });
});
