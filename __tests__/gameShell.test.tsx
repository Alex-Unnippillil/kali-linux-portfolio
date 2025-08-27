import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import GameShell from '../components/GameShell';
import VirtualControls from '../components/VirtualControls';

afterEach(() => {
  window.localStorage.clear();
  cleanup();
});

describe('GameShell pause/resume', () => {
  it('toggles pause state and disables interaction', () => {
    const { getByTestId } = render(
      <GameShell gameKey="test">
        <div>game</div>
      </GameShell>
    );

    fireEvent.click(getByTestId('pause-btn'));
    expect(getByTestId('game-container')).toHaveClass('pointer-events-none');

    fireEvent.click(getByTestId('resume-btn'));
    expect(getByTestId('game-container')).not.toHaveClass('pointer-events-none');
  });
});

describe('GameShell settings persistence', () => {
  it('persists settings to localStorage', () => {
    const { getByTestId, unmount } = render(
      <GameShell gameKey="persist">
        <div />
      </GameShell>
    );

    fireEvent.click(getByTestId('settings-btn'));
    fireEvent.change(getByTestId('difficulty-select'), { target: { value: 'hard' } });
    fireEvent.click(getByTestId('close-settings'));

    unmount();

    const { getByTestId: getByTestId2 } = render(
      <GameShell gameKey="persist">
        <div />
      </GameShell>
    );

    fireEvent.click(getByTestId2('settings-btn'));
    expect(getByTestId2('difficulty-select')).toHaveValue('hard');
  });
});

describe('VirtualControls auto-hide', () => {
  it('hides after inactivity', () => {
    jest.useFakeTimers();
    const { queryByTestId } = render(<VirtualControls />);

    // show controls
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(queryByTestId('virtual-controls')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3100);
    });

    expect(queryByTestId('virtual-controls')).toBeNull();
    jest.useRealTimers();
  });
});
