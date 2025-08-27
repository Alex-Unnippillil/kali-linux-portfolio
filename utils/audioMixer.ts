// Utility to manage a single shared AudioContext with volume and mute handling
// and to ensure audio can only play after user interaction (required by browsers)

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let volume = 1;
let muted = false;
const sliders = new Set<HTMLInputElement>();
let unlockSetup = false;

function applyVolume() {
  if (masterGain) masterGain.gain.value = muted ? 0 : volume;
  sliders.forEach((s) => {
    if (s.value !== String(volume)) s.value = String(volume);
  });
}

function initContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return null;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    try {
      const storedVol = window.localStorage.getItem('audio-volume');
      const storedMute = window.localStorage.getItem('audio-muted');
      if (storedVol !== null) volume = parseFloat(storedVol);
      if (storedMute !== null) muted = storedMute === 'true';
    } catch {
      // ignore access errors
    }
    applyVolume();
  }
  if (!unlockSetup && typeof window !== 'undefined' && audioCtx) {
    unlockSetup = true;
    const resume = () => {
      audioCtx && audioCtx.state === 'suspended' && audioCtx.resume();
    };
    ['mousedown', 'touchstart', 'keydown'].forEach((evt) =>
      window.addEventListener(evt, resume, { once: true })
    );
  }
  return audioCtx;
}

export function getAudioContext(): AudioContext | null {
  return initContext();
}

export function getDestination(): AudioNode | null {
  initContext();
  return masterGain;
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  try {
    window.localStorage.setItem('audio-volume', String(volume));
  } catch {}
  applyVolume();
}

export function getVolume(): number {
  return volume;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    window.localStorage.setItem('audio-muted', m ? 'true' : 'false');
  } catch {}
  applyVolume();
}

export function isMuted(): boolean {
  return muted;
}

export function addVolumeSlider(el: HTMLInputElement) {
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
