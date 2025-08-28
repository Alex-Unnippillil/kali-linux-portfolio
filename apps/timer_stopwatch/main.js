let mode = 'timer';
let timerWorker = null;
let timerRemaining = 30;
let timerEndTime = 0;
let stopwatchWorker = null;
let stopwatchElapsed = 0;
let stopwatchStartTime = 0;
let lapNumber = 1;

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

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(timerRemaining);
}

function startTimer() {
  if (timerWorker) return;
  const mins = parseInt(minutesInput.value, 10) || 0;
  const secs = parseInt(secondsInput.value, 10) || 0;
  timerRemaining = mins * 60 + secs;
  timerEndTime = Date.now() + timerRemaining * 1000;
  updateTimerDisplay();
  timerWorker = new Worker(new URL('../../workers/timer.worker.js', import.meta.url));
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

function startWatch() {
  if (stopwatchWorker) return;
  stopwatchStartTime = Date.now() - stopwatchElapsed * 1000;
  stopwatchWorker = new Worker(new URL('../../workers/timer.worker.js', import.meta.url));
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

document.getElementById('startTimer').addEventListener('click', startTimer);
document.getElementById('stopTimer').addEventListener('click', stopTimer);
document.getElementById('resetTimer').addEventListener('click', resetTimer);

document.getElementById('startWatch').addEventListener('click', startWatch);
document.getElementById('stopWatch').addEventListener('click', stopWatch);
document.getElementById('resetWatch').addEventListener('click', resetWatch);
document.getElementById('lapWatch').addEventListener('click', lapWatch);

// Initialize displays
updateTimerDisplay();
updateStopwatchDisplay();
