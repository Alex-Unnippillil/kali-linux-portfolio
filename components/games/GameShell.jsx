import React from 'react';
import VirtualControls from './VirtualControls';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useGameHaptics from '../../hooks/useGameHaptics';
import usePersistedState from '../../hooks/usePersistedState';
import useOrientationGuard from '../../hooks/useOrientationGuard';

const defaultControls = [
  { id: 'ArrowLeft', label: 'Left' },
  { id: 'ArrowRight', label: 'Right' },
  { id: 'ArrowUp', label: 'Up' },
  { id: 'ArrowDown', label: 'Down' },
  { id: 'Space', label: 'A' },
];

export default function GameShell({ children, controls = defaultControls }) {
  const { pressed, down, up } = useGameInput();
  const { playClick } = useGameAudio();
  const { vibrate } = useGameHaptics();
  const { allowed, Overlay } = useOrientationGuard('landscape');
  const [controlConfig] = usePersistedState('game-controls', controls, {
    version: 1,
  });

  const handlePress = (id) => {
    down(id);
    playClick();
    vibrate(30);
  };

  const handleRelease = (id) => {
    up(id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-2 bg-gray-900 text-white text-center">Top Bar</div>
      <div className="flex-1 relative bg-black text-white">
        {children}
        {Overlay}
      </div>
      <div className="flex-none p-2 bg-gray-900 text-white">
        <VirtualControls
          controls={controlConfig}
          onPress={handlePress}
          onRelease={handleRelease}
        />
      </div>
    </div>
  );
}
