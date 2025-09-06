import { isBrowser } from '../../utils/env';

if (isBrowser) {
let mode = 'timer';
const timers = {};
let stopwatchWorker = null;
let stopwatchElapsed = 0;
let stopwatchStartTime = 0;
let lapNumber = 1;

const stopwatchDisplay = document.getElementById('stopwatchDisplay');
const timerControls = document.getElementById('timerControls');
const stopwatchControls = document.getElementById('stopwatchControls');
const nameInput = document.getElementById('timerName');
const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const addTimerBtn = document.getElementById('addTimer');
const timersList = document.getElementById('timersList');
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
  if (mode === 'timer') {
    timerControls.style.display = 'block';
    stopwatchControls.style.display = 'none';
  } else {
    timerControls.style.display = 'none';
    stopwatchControls.style.display = 'block';
  }
}

document.getElementById('modeTimer').addEventListener('click', () => switchMode('timer'));
document.getElementById('modeStopwatch').addEventListener('click', () => switchMode('stopwatch'));

function addTimer() {
  if (typeof Worker !== 'function') return;
  const name = (nameInput.value || '').trim() || 'Timer';
  const mins = parseInt(minutesInput.value, 10) || 0;
  const secs = parseInt(secondsInput.value, 10) || 0;
  const total = mins * 60 + secs;
  if (total <= 0) return;
  const id = Date.now().toString();
  const endTime = Date.now() + total * 1000;
  const li = document.createElement('li');
  const label = document.createElement('span');
  label.textContent = `${name}: `;
  const timeSpan = document.createElement('span');
  timeSpan.textContent = formatTime(total);
  const stopBtn = document.createElement('button');
  stopBtn.textContent = '✖';
  stopBtn.style.marginLeft = '10px';
  stopBtn.addEventListener('click', () => stopTimer(id));
  li.appendChild(label);
  li.appendChild(timeSpan);
  li.appendChild(stopBtn);
  timersList.appendChild(li);
  const worker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url));
  worker.onmessage = () => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    timeSpan.textContent = formatTime(remaining);
    if (remaining <= 0) {
      stopTimer(id, true);
    }
  };
  worker.postMessage({ action: 'start', interval: 1000 });
  timers[id] = { name, worker, li };
  nameInput.value = '';
}

function stopTimer(id, completed = false) {
  const t = timers[id];
  if (!t) return;
  t.worker.postMessage({ action: 'stop' });
  t.worker.terminate();
  t.li.remove();
  delete timers[id];
  if (completed) {
    playSound();
    showToast(`${t.name} done`);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.top = '1rem';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = '#1f2937';
  toast.style.color = '#fff';
  toast.style.border = '1px solid #374151';
  toast.style.padding = '0.75rem 1rem';
  toast.style.borderRadius = '0.375rem';
  toast.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

function updateStopwatchDisplay() {
  stopwatchDisplay.textContent = formatTime(stopwatchElapsed);
}

function startWatch() {
  if (stopwatchWorker || typeof Worker !== 'function') return;
  stopwatchStartTime = Date.now() - stopwatchElapsed * 1000;
  stopwatchWorker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url));
  stopwatchWorker.onmessage = () => {
    stopwatchElapsed = Math.floor((Date.now() - stopwatchStartTime) / 1000);
    updateStopwatchDisplay();
  };
  stopwatchWorker.postMessage({ action: 'start', interval: 1000 });
}

function stopWatch() {
  if (stopwatchWorker) {
    stopwatchWorker.postMessage({ action: 'stop' });
    stopwatchWorker.terminate();
    stopwatchWorker = null;
  }
}

function resetWatch() {
  stopWatch();
  stopwatchElapsed = 0;
  lapNumber = 1;
  updateStopwatchDisplay();
  lapsList.innerHTML = '';
}

function lapWatch() {
  const li = document.createElement('li');
  li.textContent = `Lap ${lapNumber++}: ${formatTime(stopwatchElapsed)}`;
  lapsList.appendChild(li);
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

addTimerBtn.addEventListener('click', addTimer);

document.getElementById('startWatch').addEventListener('click', startWatch);
document.getElementById('stopWatch').addEventListener('click', stopWatch);
document.getElementById('resetWatch').addEventListener('click', resetWatch);
document.getElementById('lapWatch').addEventListener('click', lapWatch);

// Initialize display
updateStopwatchDisplay();
}
