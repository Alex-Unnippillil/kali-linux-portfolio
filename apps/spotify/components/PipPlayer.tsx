'use client';

import { useEffect } from 'react';
import { usePipPortal } from '../../../components/common/PipPortal';
import usePersistentState from '../../../hooks/usePersistentState';

interface PipPlayerProps {
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

const PipPlayer = ({
  onTogglePlay,
  onNext,
  onPrevious,
  disabled = false,
}: PipPlayerProps)  => {
  const { open, close, isOpen } = usePipPortal();
  const [minimized, setMinimized] = usePersistentState(
    'spotify-pip-minimized',
    false,
    (v): v is boolean => typeof v === 'boolean',
  );

  useEffect(() => {
    if (minimized) {
      const Controls = () => (
        <div
          style={{
            padding: 8,
            background: 'black',
            color: 'white',
            fontFamily: 'sans-serif',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <button onClick={onPrevious} disabled={disabled} aria-label="Previous">
            ⏮
          </button>
          <button onClick={onTogglePlay} disabled={disabled} aria-label="Play/Pause">
            ⏯
          </button>
          <button onClick={onNext} disabled={disabled} aria-label="Next">
            ⏭
          </button>
        </div>
      );
      open(<Controls />).then((win) => {
        if (!win) setMinimized(false);
      }).catch(() => setMinimized(false));
    } else {
      close();
    }
  }, [minimized, open, close, onNext, onPrevious, onTogglePlay, disabled, setMinimized]);

  useEffect(() => {
    if (!isOpen && minimized) setMinimized(false);
  }, [isOpen, minimized, setMinimized]);

  if (minimized) {
    return (
      <button onClick={() => setMinimized(false)} className="border px-2 py-1 rounded">
        Restore
      </button>
    );
  }

  return (
    <div className="space-x-2">
      <button onClick={onPrevious} title="Previous" disabled={disabled}>
        ⏮
      </button>
      <button onClick={onTogglePlay} title="Play/Pause" disabled={disabled}>
        ⏯
      </button>
      <button onClick={onNext} title="Next" disabled={disabled}>
        ⏭
      </button>
      <button onClick={() => setMinimized(true)} className="border px-2 py-1 rounded">
        PiP
      </button>
    </div>
  );
};

export default PipPlayer;

