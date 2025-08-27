export interface EnvelopeConfig {
  attack?: number;
  release?: number;
}

/**
 * Schedule a short oscillator with a gain envelope aligned to the next beat.
 *
 * @param ctx Web Audio context
 * @param bpm Tempo in beats per minute
 * @param offset Time offset in seconds applied to schedule (used for latency)
 * @param config Envelope configuration
 * @returns The scheduled start time in context time
 */
export function scheduleEnvelope(
  ctx: AudioContext,
  bpm: number,
  offset = 0,
  config: EnvelopeConfig = {}
): number {
  const attack = config.attack ?? 0.01;
  const release = config.release ?? 0.1;
  const beat = 60 / bpm;
  const now = ctx.currentTime;
  // Find the next beat time and apply any latency offset
  const start = Math.ceil((now + offset) / beat) * beat;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(1, start + attack);
  gain.gain.linearRampToValueAtTime(0, start + attack + release);

  osc.start(start);
  osc.stop(start + attack + release);

  return start;
}

/**
 * Calculate latency in milliseconds between a user input and the last beat.
 *
 * @param ctx Web Audio context
 * @param lastBeatTime Time of the last scheduled beat (seconds)
 * @returns Latency in milliseconds
 */
export function measureLatency(ctx: AudioContext, lastBeatTime: number): number {
  const now = ctx.currentTime;
  return (now - lastBeatTime) * 1000;
}
