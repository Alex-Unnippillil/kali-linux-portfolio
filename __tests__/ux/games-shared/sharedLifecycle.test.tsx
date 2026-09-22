import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GameLayout from '../../../components/apps/GameLayout';
import VirtualPad from '../../../components/apps/Games/common/VirtualPad';
import useGameInput from '../../../hooks/useGameInput';

jest.mock('../../../components/apps/Games/common/perf', () => () => null);
jest.mock('../../../hooks/usePrefersReducedMotion', () => () => true);

function InputFixture({
  focused = true,
  enabled = true,
  onInput,
}: {
  focused?: boolean;
  enabled?: boolean;
  onInput: jest.Mock;
}) {
  useGameInput({
    game: 'contract-fixture',
    isFocused: focused,
    enabled,
    onInput,
  });
  return <button type="button">Game surface</button>;
}

describe('shared game lifecycle contract', () => {
  beforeEach(() => window.localStorage.clear());

  it('gives keyboard input only to the focused, enabled game', () => {
    const activeInput = jest.fn();
    const inactiveInput = jest.fn();
    const { rerender, unmount } = render(
      <>
        <InputFixture onInput={activeInput} />
        <InputFixture focused={false} onInput={inactiveInput} />
      </>,
    );

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(activeInput).toHaveBeenCalledWith({ action: 'up', type: 'keydown' });
    expect(inactiveInput).not.toHaveBeenCalled();

    rerender(<InputFixture enabled={false} onInput={activeInput} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(activeInput).toHaveBeenCalledTimes(1);

    unmount();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(activeInput).toHaveBeenCalledTimes(1);
  });

  it('ignores editable and composing keyboard events', () => {
    const onInput = jest.fn();
    render(<InputFixture onInput={onInput} />);
    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp', isComposing: true });

    expect(onInput).not.toHaveBeenCalled();
    input.remove();
  });

  it('pauses on focus loss and requires an explicit resume', () => {
    const onPauseChange = jest.fn();
    const { rerender } = render(
      <GameLayout gameId="fixture" isFocused onPauseChange={onPauseChange}>
        <div>Game</div>
      </GameLayout>,
    );

    rerender(
      <GameLayout gameId="fixture" isFocused={false} onPauseChange={onPauseChange}>
        <div>Game</div>
      </GameLayout>,
    );
    expect(screen.getByRole('dialog', { name: 'Game paused' })).toBeInTheDocument();

    rerender(
      <GameLayout gameId="fixture" isFocused onPauseChange={onPauseChange}>
        <div>Game</div>
      </GameLayout>,
    );
    expect(screen.getByRole('dialog', { name: 'Game paused' })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('dialog', { name: 'Game paused' }).querySelector('button')!,
    );
    expect(screen.queryByRole('dialog', { name: 'Game paused' })).not.toBeInTheDocument();
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
  });

  it('provides keyboard-clickable equivalents for touch controls and announces results', () => {
    const onDirection = jest.fn();
    const onButton = jest.fn();
    render(
      <GameLayout gameId="fixture" result="You won with 120 points">
        <VirtualPad onDirection={onDirection} onButton={onButton} />
      </GameLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move left' }));
    fireEvent.click(screen.getByRole('button', { name: 'Action A' }));

    expect(onDirection).toHaveBeenCalledWith({ x: -1, y: 0 });
    expect(onButton).toHaveBeenCalledWith('A');
    expect(screen.getByText('You won with 120 points')).toHaveAttribute(
      'aria-live',
      'assertive',
    );
  });
});
