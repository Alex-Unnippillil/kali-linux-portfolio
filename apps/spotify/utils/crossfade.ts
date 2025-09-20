export default class CrossfadePlayer {
  private ctx: AudioContext | null = null;
  private gains: [GainNode, GainNode] | null = null;
  private sources: [AudioBufferSourceNode | null, AudioBufferSourceNode | null] = [
    null,
    null,
  ];
  private analyser: AnalyserNode | null = null;
  private current = 0;
  private startTime = 0;
  private bufferCache = new Map<string, AudioBuffer>();
  private pendingBuffers = new Map<string, Promise<AudioBuffer | null>>();

  private async loadBuffer(url: string) {
    this.ensureContext();
    const ctx = this.ctx;
    if (!ctx) return null;

    const cached = this.bufferCache.get(url);
    if (cached) return cached;

    const pending = this.pendingBuffers.get(url);
    if (pending) return pending;

    const loader = (async () => {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arr);
        this.bufferCache.set(url, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        this.pendingBuffers.delete(url);
      }
    })();

    this.pendingBuffers.set(url, loader);
    return loader;
  }

  async preload(url: string) {
    await this.loadBuffer(url);
  }

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

  async play(url: string, fadeSec = 0, offset = 0, options: { gapless?: boolean } = {}) {
    this.ensureContext();
    const ctx = this.ctx;
    const gains = this.gains;
    if (!ctx || !gains) return;
    try {
      const buffer = await this.loadBuffer(url);
      if (!buffer) return;
      const nextIndex = (this.current + 1) % 2;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gains[nextIndex]);
      const previousIndex = this.current;
      const previousSource = this.sources[previousIndex];
      const previousGain = gains[previousIndex];
      if (previousSource) previousSource.onended = null;

      const gapless = options.gapless ?? false;
      const now = ctx.currentTime;
      const previousDuration = previousSource?.buffer?.duration ?? 0;
      const scheduledStart =
        gapless && previousSource && previousDuration
          ? this.startTime + previousDuration - Math.min(fadeSec, previousDuration)
          : now;
      const startAt = Math.max(now, scheduledStart);
      const fadeEnd = startAt + fadeSec;

      gains[nextIndex].gain.cancelScheduledValues(now);
      gains[nextIndex].gain.setValueAtTime(fadeSec > 0 ? 0 : 1, startAt);
      if (fadeSec > 0) {
        gains[nextIndex].gain.linearRampToValueAtTime(1, fadeEnd);
      }

      if (previousGain) {
        previousGain.gain.cancelScheduledValues(now);
        if (fadeSec > 0) {
          previousGain.gain.setValueAtTime(1, startAt);
          previousGain.gain.linearRampToValueAtTime(0, fadeEnd);
        } else {
          previousGain.gain.setValueAtTime(0, startAt);
        }
      }

      if (fadeSec > 0) {
        previousSource?.stop(fadeEnd);
      } else if (gapless && previousSource) {
        previousSource.stop(startAt);
      } else {
        previousSource?.stop();
      }

      src.start(startAt, offset);
      this.startTime = startAt - offset;
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

  getCurrentTime() {
    if (!this.ctx) return 0;
    return Math.max(0, this.ctx.currentTime - this.startTime);
  }

  getDuration() {
    return this.sources[this.current]?.buffer?.duration ?? 0;
  }

  seek(time: number) {
    this.ensureContext();
    const ctx = this.ctx;
    const gains = this.gains;
    const buffer = this.sources[this.current]?.buffer;
    if (!ctx || !gains || !buffer) return;
    const gain = gains[this.current];
    this.sources[this.current]?.stop();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    gain.gain.setValueAtTime(1, ctx.currentTime);
    src.start(0, time);
    this.sources[this.current] = src;
    this.startTime = ctx.currentTime - time;
  }

  dispose() {
    this.sources.forEach((s) => s?.stop());
    this.sources = [null, null];
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.gains = null;
      this.analyser = null;
      this.startTime = 0;
    }
    this.bufferCache.clear();
    this.pendingBuffers.clear();
  }
}

