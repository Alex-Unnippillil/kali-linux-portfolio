import React, { useState, useEffect, useCallback } from 'react';

interface HUDProps {
  paused?: boolean;
  muted?: boolean;
  onPause?: (v: boolean) => void;
  onMute?: (v: boolean) => void;
}

const HUD: React.FC<HUDProps> = ({ paused = false, muted = false, onPause, onMute }) => {
  const [fps, setFps] = useState(0);

  // FPS counter
  useEffect(() => {
    let raf: number;
    let frames = 0;
    let last = performance.now();
    const loop = (time: number) => {
      frames += 1;
      if (time - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = time;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const togglePause = useCallback(() => onPause?.(!paused), [onPause, paused]);
  const toggleMute = useCallback(() => onMute?.(!muted), [onMute, muted]);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePause, toggleMute]);

  const fireKey = (key: string, type: 'keydown' | 'keyup') => {
    const codeMap: Record<string, string> = {
      ArrowUp: 'ArrowUp',
      ArrowDown: 'ArrowDown',
      ArrowLeft: 'ArrowLeft',
      ArrowRight: 'ArrowRight',
      ' ': 'Space',
      h: 'KeyH',
    };
    const event = new KeyboardEvent(type, { key, code: codeMap[key] || key });
    window.dispatchEvent(event);
  };

  const bindButton = (key: string) => ({
    onMouseDown: () => fireKey(key, 'keydown'),
    onMouseUp: () => fireKey(key, 'keyup'),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      fireKey(key, 'keydown');
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      fireKey(key, 'keyup');
    },
  });

  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <div className="pointer-events-none select-none absolute inset-0 z-40">
      <div className="absolute top-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
        FPS: {fps}
      </div>
      <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto">
        <button type="button" onClick={togglePause} className="px-2 py-1 bg-gray-700 text-white rounded">
          {paused ? 'Resume' : 'Pause'} [P]
        </button>
        <button type="button" onClick={toggleMute} className="px-2 py-1 bg-gray-700 text-white rounded">
          {muted ? 'Unmute' : 'Mute'} [M]
        </button>
      </div>
      {isTouch && (
        <>
          <div className="absolute bottom-4 left-4 grid grid-cols-3 grid-rows-3 gap-1 pointer-events-auto">
            <div />
            <button className="w-10 h-10 bg-gray-700 text-white rounded" {...bindButton('ArrowUp')}>
              ▲
            </button>
            <div />
            <button className="w-10 h-10 bg-gray-700 text-white rounded" {...bindButton('ArrowLeft')}>
              ◀
            </button>
            <div className="w-10 h-10" />
            <button className="w-10 h-10 bg-gray-700 text-white rounded" {...bindButton('ArrowRight')}>
              ▶
            </button>
            <div />
            <button className="w-10 h-10 bg-gray-700 text-white rounded" {...bindButton('ArrowDown')}>
              ▼
            </button>
            <div />
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
            <button className="w-12 h-12 bg-gray-700 text-white rounded-full" {...bindButton(' ')}>
              A
            </button>
            <button className="w-12 h-12 bg-gray-700 text-white rounded-full" {...bindButton('h')}>
              B
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HUD;
