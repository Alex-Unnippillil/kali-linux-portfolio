'use client';
import { useEffect, useState, useRef } from 'react';
import useIntersection from '../../hooks/useIntersection';
import './styles.css';

export default function TimerStopwatch() {
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersection(containerRef);
  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      import('./main');
    }
  }, [isVisible]);

  return (
    <div ref={containerRef}>
      <div role="tablist" className="tabs">
        <button
          id="modeTimer"
          role="tab"
          className="tab"
          aria-selected={mode === 'timer'}
          onClick={() => setMode('timer')}
        >
          Timer
        </button>
        <button
          id="modeStopwatch"
          role="tab"
          className="tab"
          aria-selected={mode === 'stopwatch'}
          onClick={() => setMode('stopwatch')}
        >
          Stopwatch
        </button>
      </div>
      <div
        id="timerControls"
        role="tabpanel"
        className="tab-panel"
        hidden={mode !== 'timer'}
        style={{ contentVisibility: 'auto' }}
      >
        <div>
          <input type="number" id="minutes" min="0" defaultValue="0" /> :
          <input type="number" id="seconds" min="0" max="59" defaultValue="30" />
        </div>
        <div className="display" id="timerDisplay">00:30</div>
        <div>
          <button id="startTimer">Start</button>
          <button id="stopTimer">Stop</button>
          <button id="resetTimer">Reset</button>
        </div>
      </div>
      <div
        id="stopwatchControls"
        role="tabpanel"
        className="tab-panel"
        hidden={mode !== 'stopwatch'}
        style={{ contentVisibility: 'auto' }}
      >
        <div className="display" id="stopwatchDisplay">00:00</div>
        <div>
          <button id="startWatch">Start</button>
          <button id="stopWatch">Stop</button>
          <button id="resetWatch">Reset</button>
          <button id="lapWatch">Lap</button>
        </div>
        <ul id="laps" />
      </div>
    </div>
  );
}

