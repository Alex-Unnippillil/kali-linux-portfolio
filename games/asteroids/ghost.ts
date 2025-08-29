export interface GhostFrame {
  x: number;
  y: number;
  angle: number;
}

const STORAGE_KEY = 'asteroids_ghost';

/**
 * Load a saved ghost replay from localStorage.
 */
export const loadReplay = (): GhostFrame[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GhostFrame[]) : [];
  } catch {
    return [];
  }
};

/**
 * Persist a ghost replay to localStorage for later viewing.
 */
export const saveReplay = (frames: GhostFrame[]): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));
  } catch {}
};

/**
 * Helper to record player movement and play it back as a ghost.
 */
export class GhostRecorder {
  private frames: GhostFrame[];
  private playbackIndex = 0;

  constructor(initial?: GhostFrame[]) {
    this.frames = initial ? initial.slice() : [];
  }

  /** Record a single frame of player movement. */
  record(x: number, y: number, angle: number): void {
    this.frames.push({ x, y, angle });
  }

  /**
   * Get the next ghost frame for overlay playback.
   * Returns null when the replay has finished.
   */
  step(): GhostFrame | null {
    if (this.playbackIndex >= this.frames.length) return null;
    const frame = this.frames[this.playbackIndex];
    this.playbackIndex += 1;
    return frame;
  }

  /** Reset playback to the beginning. */
  resetPlayback(): void {
    this.playbackIndex = 0;
  }

  /** Retrieve all recorded frames. */
  getFrames(): GhostFrame[] {
    return this.frames;
  }

  /** Clear all recorded frames. */
  reset(): void {
    this.frames = [];
    this.playbackIndex = 0;
  }
}

export default GhostRecorder;
