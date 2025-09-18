export interface AudioTrack {
  title?: string;
  url: string;
  cover?: string;
}

interface WebAudioManagerOptions {
  crossfade?: number;
  gapless?: boolean;
  onAdvance?: (index: number) => void;
  createContext?: () => AudioContext;
  fetcher?: (url: string) => Promise<ArrayBuffer>;
}

interface PendingTrack {
  slot: 0 | 1;
  index: number;
  startAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  source: AudioBufferSourceNode;
}

const MIN_FADE = 0.05;
const END_GUARD = 0.05;

const defaultFetcher = async (url: string) => {
  const res = await fetch(url);
  return res.arrayBuffer();
};

export default class WebAudioManager {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gains: [GainNode, GainNode] | null = null;
  private sources: [AudioBufferSourceNode | null, AudioBufferSourceNode | null] = [
    null,
    null,
  ];
  private activeSlot: 0 | 1 = 0;
  private queue: AudioTrack[] = [];
  private currentIndex = -1;
  private startTime = 0;
  private crossfade: number;
  private gapless: boolean;
  private onAdvance?: (index: number) => void;
  private createContext?: () => AudioContext;
  private fetcher: (url: string) => Promise<ArrayBuffer>;
  private bufferCache = new Map<string, AudioBuffer>();
  private decodePromises = new Map<string, Promise<AudioBuffer>>();
  private pending?: PendingTrack;

  constructor(options: WebAudioManagerOptions = {}) {
    this.crossfade = options.crossfade ?? 0;
    this.gapless = options.gapless ?? false;
    this.onAdvance = options.onAdvance;
    this.createContext = options.createContext;
    this.fetcher = options.fetcher ?? defaultFetcher;
  }

  setAdvanceHandler(handler?: (index: number) => void) {
    this.onAdvance = handler;
  }

  setQueue(queue: AudioTrack[]) {
    this.queue = queue;
    if (this.currentIndex >= queue.length) {
      this.currentIndex = -1;
      this.clearCurrent();
    }
    if (!this.gapless) {
      this.clearPending();
    } else {
      void this.scheduleNext();
    }
  }

  setCrossfade(seconds: number) {
    this.crossfade = Math.max(0, seconds);
    if (this.gapless) {
      void this.scheduleNext();
    }
  }

  setGapless(enabled: boolean) {
    if (this.gapless === enabled) return;
    this.gapless = enabled;
    if (!enabled) {
      this.clearPending();
    } else {
      void this.scheduleNext();
    }
  }

  getAnalyser() {
    return this.analyser;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getCurrentTime() {
    if (!this.ctx || this.currentIndex === -1) return 0;
    return Math.max(0, this.ctx.currentTime - this.startTime);
  }

  getDuration() {
    const source = this.sources[this.activeSlot];
    return source?.buffer?.duration ?? 0;
  }

  async play(index: number, offset = 0) {
    const ctx = this.ensureContext();
    const gains = this.gains;
    if (!ctx || !gains) return;
    const track = this.queue[index];
    if (!track) return;

    const buffer = await this.loadBuffer(track);
    if (!buffer) return;

    const previousSlot = this.activeSlot;
    const nextSlot: 0 | 1 = previousSlot === 0 ? 1 : 0;
    const previousSource = this.sources[previousSlot];
    const previousBuffer = previousSource?.buffer ?? null;
    const previousRemaining = this.getRemainingTime();

    this.clearPending();

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gains[nextSlot]);
    const now = ctx.currentTime;
    const startAt = now;
    const fade = this.computeManualFade(previousBuffer, buffer, previousRemaining);

    gains[nextSlot].gain.cancelScheduledValues(startAt);
    if (this.currentIndex === -1 || fade <= 0) {
      gains[nextSlot].gain.setValueAtTime(1, startAt);
    } else {
      gains[nextSlot].gain.setValueAtTime(0, startAt);
      gains[nextSlot].gain.linearRampToValueAtTime(1, startAt + fade);
      const previousGain = gains[previousSlot];
      previousGain.gain.cancelScheduledValues(startAt);
      previousGain.gain.setValueAtTime(previousGain.gain.value ?? 1, startAt);
      previousGain.gain.linearRampToValueAtTime(0, startAt + fade);
      previousSource?.stop(startAt + fade);
    }

    src.start(startAt, offset);

    src.onended = () => {
      if (this.sources[nextSlot] === src) {
        this.sources[nextSlot] = null;
      }
    };

    this.sources[nextSlot] = src;
    this.activeSlot = nextSlot;
    this.currentIndex = index;
    this.startTime = startAt - offset;

    if (!this.analyser) {
      this.analyser = this.ensureAnalyser();
    }

    if (this.gapless) {
      void this.scheduleNext();
    }
  }

  toggle() {
    if (!this.ctx) return;
    if (this.ctx.state === "running") {
      void this.ctx.suspend();
    } else {
      void this.ctx.resume();
    }
  }

  seek(time: number) {
    const ctx = this.ctx;
    const gains = this.gains;
    const source = this.sources[this.activeSlot];
    if (!ctx || !gains || !source || !source.buffer) return;

    const gain = gains[this.activeSlot];
    const buffer = source.buffer;
    this.clearPending();
    source.stop();

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(1, ctx.currentTime);
    src.start(ctx.currentTime, time);
    src.onended = () => {
      if (this.sources[this.activeSlot] === src) {
        this.sources[this.activeSlot] = null;
      }
    };
    this.sources[this.activeSlot] = src;
    this.startTime = ctx.currentTime - time;

    if (this.gapless) {
      void this.scheduleNext();
    }
  }

  dispose() {
    this.clearPending();
    this.sources.forEach((s) => s?.stop());
    this.sources = [null, null];
    this.bufferCache.clear();
    this.decodePromises.clear();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.analyser = null;
    this.gains = null;
    this.currentIndex = -1;
    this.startTime = 0;
  }

  private clearCurrent() {
    this.sources.forEach((s) => s?.stop());
    this.sources = [null, null];
    this.activeSlot = 0;
    this.startTime = 0;
  }

  private ensureContext() {
    if (this.ctx) return this.ctx;
    const ctx = this.createContext?.() ?? this.createBrowserContext();
    if (!ctx) return null;
    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    gainA.gain.value = 0;
    gainB.gain.value = 0;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    gainA.connect(analyser);
    gainB.connect(analyser);
    analyser.connect(ctx.destination);
    this.ctx = ctx;
    this.analyser = analyser;
    this.gains = [gainA, gainB];
    return ctx;
  }

  private ensureAnalyser() {
    const ctx = this.ensureContext();
    if (!ctx || !this.gains) return this.analyser;
    if (this.analyser) return this.analyser;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    this.gains[0].connect(analyser);
    this.gains[1].connect(analyser);
    analyser.connect(ctx.destination);
    this.analyser = analyser;
    return analyser;
  }

  private createBrowserContext() {
    if (typeof window === "undefined") return null;
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as
      | (new () => AudioContext)
      | undefined;
    if (!Ctor) return null;
    return new Ctor();
  }

  private async loadBuffer(track: AudioTrack) {
    if (this.bufferCache.has(track.url)) return this.bufferCache.get(track.url)!;
    if (this.decodePromises.has(track.url)) return this.decodePromises.get(track.url)!;
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const promise = this.fetcher(track.url)
      .then((arr) => ctx.decodeAudioData(arr.slice(0)))
      .then((buffer) => {
        this.bufferCache.set(track.url, buffer);
        this.decodePromises.delete(track.url);
        return buffer;
      })
      .catch((err) => {
        this.decodePromises.delete(track.url);
        throw err;
      });
    this.decodePromises.set(track.url, promise);
    return promise;
  }

  private getRemainingTime() {
    const ctx = this.ctx;
    const source = this.sources[this.activeSlot];
    const buffer = source?.buffer;
    if (!ctx || !buffer) return 0;
    const elapsed = ctx.currentTime - this.startTime;
    return Math.max(0, buffer.duration - elapsed);
  }

  private computeManualFade(
    previousBuffer: AudioBuffer | null,
    nextBuffer: AudioBuffer,
    previousRemaining: number,
  ) {
    if (!previousBuffer) return 0;
    const nextAvailable = Math.max(0, nextBuffer.duration - END_GUARD);
    const prevAvailable = Math.max(0, previousRemaining - END_GUARD);
    const maxFade = Math.min(prevAvailable, nextAvailable);
    if (maxFade <= 0) return 0;
    if (this.crossfade <= 0) {
      return Math.min(MIN_FADE, maxFade);
    }
    return Math.min(this.crossfade, maxFade);
  }

  private async scheduleNext() {
    if (!this.gapless) {
      this.clearPending();
      return;
    }
    const ctx = this.ctx;
    const gains = this.gains;
    const currentSource = this.sources[this.activeSlot];
    if (!ctx || !gains || !currentSource || !currentSource.buffer) return;
    if (!this.queue.length) return;
    const nextIndex = (this.currentIndex + 1) % this.queue.length;
    if (nextIndex === this.currentIndex) return;
    const track = this.queue[nextIndex];
    if (!track) return;

    this.clearPending();

    const buffer = await this.loadBuffer(track);
    if (!buffer || !currentSource.buffer) return;

    const now = ctx.currentTime;
    const currentDuration = currentSource.buffer.duration;
    const elapsed = now - this.startTime;
    const currentRemaining = Math.max(0, currentDuration - elapsed);
    if (currentRemaining <= 0) return;

    const maxFade = Math.min(
      Math.max(0, currentDuration - END_GUARD),
      Math.max(0, buffer.duration - END_GUARD),
      currentRemaining,
    );
    if (maxFade <= 0) return;
    const requested = this.crossfade > 0 ? this.crossfade : MIN_FADE;
    const fade = Math.min(requested, maxFade);

    const startAt = Math.max(now, this.startTime + currentDuration - fade);
    const slot: 0 | 1 = this.activeSlot === 0 ? 1 : 0;

    const gain = gains[slot];
    gain.gain.cancelScheduledValues(startAt);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(1, startAt + fade);

    const currentGain = gains[this.activeSlot];
    currentGain.gain.cancelScheduledValues(startAt);
    currentGain.gain.setValueAtTime(currentGain.gain.value ?? 1, startAt);
    currentGain.gain.linearRampToValueAtTime(0, startAt + fade);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.start(startAt);
    src.onended = () => {
      if (this.sources[slot] === src) {
        this.sources[slot] = null;
      }
    };

    const delay = Math.max(0, startAt - now);
    const timer = typeof setTimeout === "function" ? setTimeout(() => {
      if (!this.pending || this.pending.source !== src) return;
      this.promotePending();
    }, delay * 1000) : null;

    this.sources[slot] = src;
    this.pending = { slot, index: nextIndex, startAt, timer, source: src };
  }

  private promotePending() {
    if (!this.pending) return;
    const { slot, index, startAt, timer } = this.pending;
    if (timer) clearTimeout(timer);
    this.activeSlot = slot;
    this.currentIndex = index;
    this.startTime = startAt;
    this.pending = undefined;
    this.onAdvance?.(index);
    void this.scheduleNext();
  }

  private clearPending() {
    if (!this.pending) return;
    const { source, timer, slot } = this.pending;
    if (timer) clearTimeout(timer);
    source.stop();
    if (this.sources[slot] === source) {
      this.sources[slot] = null;
    }
    this.pending = undefined;
  }
}
