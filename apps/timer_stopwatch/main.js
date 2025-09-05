import { isBrowser } from '../../utils/env';

if (isBrowser) {
let mode = 'timer';
let timerWorker = null;
let timerRemaining = 30;
let timerEndTime = 0;
let stopwatchWorker = null;
let stopwatchElapsed = 0;
let stopwatchStartTime = 0;
let lapNumber = 1;
let laps = [];

const STORAGE_KEY = 'stopwatchState';

const timerDisplay = document.getElementById('timerDisplay');
const stopwatchDisplay = document.getElementById('stopwatchDisplay');
const timerControls = document.getElementById('timerControls');
const stopwatchControls = document.getElementById('stopwatchControls');
const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const lapsList = document.getElementById('laps');

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function switchMode(newMode) {
  mode = newMode;
  timerControls.hidden = mode !== 'timer';
  stopwatchControls.hidden = mode !== 'stopwatch';
}

document.getElementById('modeTimer').addEventListener('click', () => switchMode('timer'));
document.getElementById('modeStopwatch').addEventListener('click', () => switchMode('stopwatch'));

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timerRemaining);
}

function startTimer() {
  if (timerWorker || typeof Worker !== 'function') return;
  const mins = parseInt(minutesInput.value, 10) || 0;
  const secs = parseInt(secondsInput.value, 10) || 0;
  timerRemaining = mins * 60 + secs;
  timerEndTime = Date.now() + timerRemaining * 1000;
  updateTimerDisplay();
  timerWorker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url));
  timerWorker.onmessage = () => {
    timerRemaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
    updateTimerDisplay();
    if (timerRemaining <= 0) {
      stopTimer();
      playSound();
    }
  };
  timerWorker.postMessage({ action: 'start', interval: 1000 });
}

function stopTimer() {
  if (timerWorker) {
    timerWorker.postMessage({ action: 'stop' });
    timerWorker.terminate();
    timerWorker = null;
  }
}

function resetTimer() {
  stopTimer();
  const mins = parseInt(minutesInput.value, 10) || 0;
  const secs = parseInt(secondsInput.value, 10) || 0;
  timerRemaining = mins * 60 + secs;
  updateTimerDisplay();
}

function updateStopwatchDisplay() {
  stopwatchDisplay.textContent = formatTime(stopwatchElapsed);
}

function saveStopwatchState() {
  try {
    const state = {
      elapsed: stopwatchElapsed,
      laps,
      running: !!stopwatchWorker,
      startTime: stopwatchStartTime,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save stopwatch state', e);
  }
}

function loadStopwatchState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    laps = Array.isArray(state.laps) ? state.laps : [];
    lapNumber = laps.length + 1;
    if (state.running && state.startTime) {
      stopwatchElapsed = Math.floor((Date.now() - state.startTime) / 1000);
    } else {
      stopwatchElapsed = state.elapsed || 0;
    }
    lapsList.innerHTML = '';
    laps.forEach((t, i) => {
      const li = document.createElement('li');
      li.textContent = `Lap ${i + 1}: ${formatTime(t)}`;
      lapsList.appendChild(li);
    });
    switchMode('stopwatch');
    updateStopwatchDisplay();
    if (state.running) {
      startWatch();
    }
  } catch (e) {
    console.error('Failed to load stopwatch state', e);
  }
}

function startWatch() {
  if (stopwatchWorker || typeof Worker !== 'function') return;
  stopwatchStartTime = Date.now() - stopwatchElapsed * 1000;
  stopwatchWorker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url));
  stopwatchWorker.onmessage = () => {
    stopwatchElapsed = Math.floor((Date.now() - stopwatchStartTime) / 1000);
    updateStopwatchDisplay();
    saveStopwatchState();
  };
  stopwatchWorker.postMessage({ action: 'start', interval: 1000 });
  saveStopwatchState();
}

function pauseWatch() {
  if (stopwatchWorker) {
    stopwatchWorker.postMessage({ action: 'stop' });
    stopwatchWorker.terminate();
    stopwatchWorker = null;
    saveStopwatchState();
  }
}

function resetWatch() {
  pauseWatch();
  stopwatchElapsed = 0;
  lapNumber = 1;
  laps = [];
  updateStopwatchDisplay();
  lapsList.innerHTML = '';
  localStorage.removeItem(STORAGE_KEY);
}

function lapWatch() {
  const li = document.createElement('li');
  li.textContent = `Lap ${lapNumber++}: ${formatTime(stopwatchElapsed)}`;
  lapsList.appendChild(li);
  laps.push(stopwatchElapsed);
  saveStopwatchState();
}

function playSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 500);
  } catch (e) {
    console.error('AudioContext not supported', e);
  }
}

document.getElementById('startTimer').addEventListener('click', startTimer);
document.getElementById('stopTimer').addEventListener('click', stopTimer);
document.getElementById('resetTimer').addEventListener('click', resetTimer);

document.getElementById('startWatch').addEventListener('click', startWatch);
document.getElementById('pauseWatch').addEventListener('click', pauseWatch);
document.getElementById('resetWatch').addEventListener('click', resetWatch);
document.getElementById('lapWatch').addEventListener('click', lapWatch);

// Initialize displays
loadStopwatchState();
updateTimerDisplay();
updateStopwatchDisplay();
}
