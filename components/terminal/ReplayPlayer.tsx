import React, { useEffect, useRef, useState } from 'react';
import type { SessionEvent } from '../../lib/session-recorder';

interface ReplayPlayerProps {
  events: SessionEvent[];
}

export default function ReplayPlayer({ events }: ReplayPlayerProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!playing) return;
    if (index >= events.length) {
      setPlaying(false);
      return;
    }
    const delay =
      index === 0
        ? 0
        : events[index].timestamp - events[index - 1].timestamp;
    timer.current = setTimeout(() => setIndex((i) => i + 1), delay);
    return () => clearTimeout(timer.current);
  }, [playing, index, events]);

  const content = events
    .slice(0, index)
    .map((e) => (e.type === 'input' ? `> ${e.data}` : e.data))
    .join('\n');

  const togglePlay = () => setPlaying((p) => !p);
  const reset = () => {
    setPlaying(false);
    setIndex(0);
  };

  return (
    <div>
      <pre data-testid="replay-output">{content}</pre>
      <div>
        <button onClick={togglePlay} data-testid="play">
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} data-testid="reset">
          Reset
        </button>
      </div>
    </div>
  );
}

