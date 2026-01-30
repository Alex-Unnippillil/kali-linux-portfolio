/**
 * Audio utilities for Simon game.
 * Provides precise tone playback per color and helpers for scheduling.
 */

const TONE_FREQUENCIES = [329.63, 261.63, 220, 164.81];

let ctx: AudioContext | null = null;
let masterVolume = 1.0;

export function setMasterVolume(val: number) {
  masterVolume = Math.max(0, Math.min(1, val));
}

export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext unavailable");
  }
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

/**
 * Play the tone associated with a Simon pad index at a specific time.
 * @param idx pad index 0-3
 * @param startTime absolute time in seconds relative to AudioContext.currentTime
 * @param duration duration in seconds
 */
export function playColorTone(
  idx: number,
  startTime: number,
  duration: number,
): void {
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = TONE_FREQUENCIES[idx];
  oscillator.connect(gain);
  gain.connect(context.destination);
  const peak = Math.max(0.0001, 0.5 * masterVolume);

  if (masterVolume < 0.01) {
    // Muted
    gain.gain.value = 0;
  } else {
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  }
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

/**
 * Create a schedule of absolute times with optional ramping between steps.
 *
 * @param length number of timestamps
 * @param start initial timestamp
 * @param step initial delta between timestamps
 * @param ramp multiplier applied to the delta each iteration
 * @returns array of scheduled times
 */
export function createToneSchedule(
  length: number,
  start: number,
  step: number,
  ramp = 1,
): number[] {
  const times: number[] = [];
  let time = start;
  let current = step;
  for (let i = 0; i < length; i += 1) {
    times.push(time);
    time += current;
    current *= ramp;
  }
  return times;
}

