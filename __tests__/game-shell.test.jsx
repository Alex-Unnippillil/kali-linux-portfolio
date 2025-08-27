import React from 'react';
import { render } from '@testing-library/react';
import GameShell from '../components/games/GameShell';
import VirtualControls from '../components/games/VirtualControls';
import useGameInput from '../hooks/useGameInput';
import useGameAudio from '../hooks/useGameAudio';
import useGameHaptics from '../hooks/useGameHaptics';
import usePersistedState from '../hooks/usePersistedState';
import useOrientationGuard from '../hooks/useOrientationGuard';

function HookTester({ hook }) {
  hook();
  return <div />;
}

describe('game utilities', () => {
  it('mounts and unmounts GameShell', () => {
    const { unmount, getByRole } = render(
      <GameShell controls={<div />} settings={<div />}>child</GameShell>
    );
    getByRole('button', { name: /pause/i });
    unmount();
  });

  it('mounts and unmounts VirtualControls', () => {
    const { unmount } = render(
      <VirtualControls>
        <button>btn</button>
      </VirtualControls>
    );
    unmount();
  });

  it('hooks mount and unmount cleanly', () => {
    const hooks = [
      useGameInput,
      useGameAudio,
      useGameHaptics,
      () => usePersistedState('test', 0),
      useOrientationGuard,
    ];

    hooks.forEach((h) => {
      const { unmount } = render(<HookTester hook={h} />);
      unmount();
    });
  });
});
