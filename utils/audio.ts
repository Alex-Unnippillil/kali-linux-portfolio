export interface ToneOptions {
  freq: number; // frequency in Hz
  ms: number; // duration in milliseconds
  wave?: OscillatorType; // waveform type
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AudioCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return null;
  ctx = new AudioCtor();
  return ctx;
}

export function playTone({ freq, ms, wave = 'sine' }: ToneOptions): void {
  if (typeof window === 'undefined') return;
  const audioCtx = getCtx();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = freq;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  const start = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.5, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
  oscillator.start(start);
  oscillator.stop(start + ms / 1000 + 0.05);
}
