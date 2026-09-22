/** Audio is created only after an input gesture, and all nodes are owned/closed. */
export function createPinballAudio() {
  let context: AudioContext | null = null;
  let muted = false;
  let disposed = false;
  const voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();
  const stopVoices = () => {
    voices.forEach(({ oscillator, gain }) => {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* An already-ended voice is harmless. */ }
      oscillator.disconnect(); gain.disconnect();
    });
    voices.clear();
  };
  return {
    unlock(): void {
      if (disposed || muted || typeof window === 'undefined') return;
      try {
        const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        context ||= new Ctor();
        if (context.state === 'suspended') void context.resume().catch(() => undefined);
      } catch { /* Gameplay never depends on audio support or permission. */ }
    },
    play(kind: string): void {
      if (disposed || muted || !context || context.state !== 'running' || voices.size >= 8) return;
      const frequency: Record<string, number> = {
        bumper: 660, target: 880, lane: 1046, spinner: 540, sling: 220,
        flipper: 130, launch: 330, jackpot: 1318, save: 784, drain: 110, tilt: 82, nudge: 165,
      };
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const voice = { oscillator, gain };
        const now = context.currentTime;
        const duration = kind === 'jackpot' ? 0.32 : 0.09;
        oscillator.type = kind === 'flipper' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency[kind] || 440, now);
        oscillator.frequency.exponentialRampToValueAtTime((frequency[kind] || 440) * 0.65, now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.045, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(voice); };
        voices.add(voice); oscillator.start(); oscillator.stop(now + duration + 0.01);
      } catch { stopVoices(); }
    },
    setMuted(value: boolean): void { muted = value; if (value) stopVoices(); },
    suspend(): void {
      stopVoices();
      if (context?.state === 'running') void context.suspend().catch(() => undefined);
    },
    destroy(): void {
      if (disposed) return;
      disposed = true; stopVoices();
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      context = null;
    },
  };
}
