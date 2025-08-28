'use client';
import { useEffect, useState } from 'react';
import './styles.css';

export default function TimerStopwatch() {
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./main');
    }
  }, []);

  return (
    <div>
      <div role="tablist" className="tabs">
        <button
          id="modeTimer"
          role="tab"
          className="tab"
          aria-selected={mode === 'timer'}
          aria-controls="timerControls"
          onClick={() => setMode('timer')}
        >
          Timer
        </button>
        <button
          id="modeStopwatch"
          role="tab"
          className="tab"
          aria-selected={mode === 'stopwatch'}
          aria-controls="stopwatchControls"
          onClick={() => setMode('stopwatch')}
        >
          Stopwatch
        </button>
      </div>
      <div
        id="timerControls"
        role="tabpanel"
        aria-labelledby="modeTimer"
        className="tab-panel"
        hidden={mode !== 'timer'}
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
        aria-labelledby="modeStopwatch"
        className="tab-panel"
        hidden={mode !== 'stopwatch'}
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

