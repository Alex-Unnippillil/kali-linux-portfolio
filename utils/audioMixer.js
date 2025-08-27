// Compiled JavaScript version of audioMixer for use in vanilla JS apps
let audioCtx = null;
let masterGain = null;
let volume = 1;
let muted = false;
const sliders = new Set();
let unlockSetup = false;
function applyVolume() {
  if (masterGain) masterGain.gain.value = muted ? 0 : volume;
  sliders.forEach((s) => {
    if (s.value !== String(volume)) s.value = String(volume);
  });
}
function initContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    try {
      const storedVol = window.localStorage.getItem('audio-volume');
      const storedMute = window.localStorage.getItem('audio-muted');
      if (storedVol !== null) volume = parseFloat(storedVol);
      if (storedMute !== null) muted = storedMute === 'true';
    } catch {}
    applyVolume();
  }
  if (!unlockSetup && typeof window !== 'undefined' && audioCtx) {
    unlockSetup = true;
    const resume = () => {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    };
    ['mousedown', 'touchstart', 'keydown'].forEach((evt) =>
      window.addEventListener(evt, resume, { once: true })
    );
  }
  return audioCtx;
}
export function getAudioContext() {
  return initContext();
}
export function getDestination() {
  initContext();
  return masterGain;
}
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  try {
    window.localStorage.setItem('audio-volume', String(volume));
  } catch {}
  applyVolume();
}
export function getVolume() {
  return volume;
}
export function setMuted(m) {
  muted = m;
  try {
    window.localStorage.setItem('audio-muted', m ? 'true' : 'false');
  } catch {}
  applyVolume();
}
export function isMuted() {
  return muted;
}
export function addVolumeSlider(el) {
  initContext();
  el.min = '0';
  el.max = '1';
  el.step = '0.01';
  el.value = String(volume);
  el.addEventListener('input', () => {
    setVolume(parseFloat(el.value));
  });
  sliders.add(el);
}
