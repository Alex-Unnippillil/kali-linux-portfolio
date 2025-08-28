let mode = 'timer';
let timerRemaining = 30;
let stopwatchElapsed = 0;
let lapNumber = 1;
let timerRunning = false;
let stopwatchRunning = false;
let worker;

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

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./ticker.worker.js', import.meta.url));
    worker.onmessage = ({ data }) => {
      if (data.type !== 'tick') return;
      if (data.id === 'timer' && timerRunning) {
        timerRemaining--;
        updateTimerDisplay();
        if (timerRemaining <= 0) {
          stopTimer();
          playSound();
        }
      } else if (data.id === 'stopwatch' && stopwatchRunning) {
        stopwatchElapsed++;
        updateStopwatchDisplay();
      }
    };
  }
  return worker;
}

function startTimer() {
  if (timerRunning) return;
  const mins = parseInt(minutesInput.value, 10) || 0;
  const secs = parseInt(secondsInput.value, 10) || 0;
  timerRemaining = mins * 60 + secs;
  updateTimerDisplay();
  timerRunning = true;
  getWorker().postMessage({ type: 'start', id: 'timer' });
}

function stopTimer() {
  if (!timerRunning) return;
  timerRunning = false;
  getWorker().postMessage({ type: 'stop', id: 'timer' });
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
  if (stopwatchRunning) return;
  stopwatchRunning = true;
  getWorker().postMessage({ type: 'start', id: 'stopwatch' });
}

function stopWatch() {
  if (!stopwatchRunning) return;
  stopwatchRunning = false;
  getWorker().postMessage({ type: 'stop', id: 'stopwatch' });
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
