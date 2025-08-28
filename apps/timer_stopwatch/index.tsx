'use client';
import { useEffect } from 'react';

export default function TimerStopwatch() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/apps/timer_stopwatch/styles.css';
    document.head.appendChild(link);

    if (typeof window !== 'undefined') {
      import('./main');
    }
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div>
      <div>
        <button id="modeTimer">Timer</button>
        <button id="modeStopwatch">Stopwatch</button>
      </div>
      <div id="timerControls">
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
      <div id="stopwatchControls" style={{ display: 'none' }}>
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

