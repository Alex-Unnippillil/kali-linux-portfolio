export default class CrossfadePlayer {
  private ctx: AudioContext | null = null;
  private gains: [GainNode, GainNode] | null = null;
  private sources: [AudioBufferSourceNode | null, AudioBufferSourceNode | null] = [null, null];
  private analyser: AnalyserNode | null = null;
  private current = 0;

  private ensureContext() {
    if (this.ctx) return;
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return;
    this.ctx = new Ctor();
    const gainA = this.ctx.createGain();
    const gainB = this.ctx.createGain();
    gainA.gain.value = 0;
    gainB.gain.value = 0;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;
    gainA.connect(analyser);
    gainB.connect(analyser);
    analyser.connect(this.ctx.destination);
    this.gains = [gainA, gainB];
    this.analyser = analyser;
  }

  async play(url: string, fadeSec = 0) {
    this.ensureContext();
    const ctx = this.ctx;
    const gains = this.gains;
    if (!ctx || !gains) return;
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arr);
      const nextIndex = (this.current + 1) % 2;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gains[nextIndex]);
      const now = ctx.currentTime;
      src.start();
      if (fadeSec > 0) {
        gains[nextIndex].gain.setValueAtTime(0, now);
        gains[nextIndex].gain.linearRampToValueAtTime(1, now + fadeSec);
        gains[this.current].gain.setValueAtTime(1, now);
        gains[this.current].gain.linearRampToValueAtTime(0, now + fadeSec);
        this.sources[this.current]?.stop(now + fadeSec);
      } else {
        gains[nextIndex].gain.setValueAtTime(1, now);
        gains[this.current].gain.setValueAtTime(0, now);
        this.sources[this.current]?.stop();
      }
      this.sources[nextIndex] = src;
      this.current = nextIndex;
    } catch {
      /* ignore load errors */
    }
  }

  toggle() {
    if (!this.ctx) return;
    if (this.ctx.state === 'running') this.ctx.suspend();
    else this.ctx.resume();
  }

  getAnalyser() {
    return this.analyser;
  }

  dispose() {
    this.sources.forEach((s) => s?.stop());
    this.sources = [null, null];
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.gains = null;
      this.analyser = null;
    }
  }
}

