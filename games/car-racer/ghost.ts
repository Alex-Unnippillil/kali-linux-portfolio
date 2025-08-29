export interface GhostFrame {
  x: number;
  y: number;
  angle: number;
}

export interface GhostLap {
  /** Lap time in seconds */
  time: number;
  /** Recorded frames for the lap */
  trace: GhostFrame[];
}

const ghostKey = (track: string) => `car-racer-ghosts-${track}`;
const bestKey = (track: string) => `car-racer-best-${track}`;

function read<T>(key: string): T | null {
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Load all ghost laps stored for a track.
 */
export function loadGhosts(track: string): GhostLap[] {
  if (typeof window === 'undefined') return [];
  return read<GhostLap[]>(ghostKey(track)) || [];
}

/**
 * Persist ghosts for a track.
 */
function saveGhosts(track: string, ghosts: GhostLap[]): void {
  if (typeof window === 'undefined') return;
  write(ghostKey(track), ghosts);
}

/**
 * Save a lap, keeping the array sorted by best time.
 * The best lap is also cached separately for quick access.
 */
export function recordLap(track: string, lap: GhostLap): void {
  if (typeof window === 'undefined') return;
  const ghosts = loadGhosts(track);
  ghosts.push(lap);
  ghosts.sort((a, b) => a.time - b.time);
  saveGhosts(track, ghosts);
  write(bestKey(track), ghosts[0]);
}

/**
 * Get the best lap recorded for a track.
 */
export function loadBestLap(track: string): GhostLap | null {
  if (typeof window === 'undefined') return null;
  return read<GhostLap>(bestKey(track));
}

/**
 * Retrieve a specific ghost by index.
 */
export function getGhost(track: string, index: number): GhostLap | null {
  const ghosts = loadGhosts(track);
  return ghosts[index] || null;
}

/**
 * List available ghosts for a track. Returns an array of lap times in
 * ascending order to help build a selection UI before the race begins.
 */
export function listGhostOptions(track: string): number[] {
  return loadGhosts(track).map((g) => g.time);
}

/**
 * Helper class used while recording a lap. Call {@link record} each frame and
 * {@link finish} when the lap completes. The finished lap will automatically be
 * stored if it is a new record.
 */
export class GhostRecorder {
  private trace: GhostFrame[] = [];
  private start = 0;

  startLap(): void {
    this.trace = [];
    this.start = performance.now();
  }

  record(x: number, y: number, angle: number): void {
    this.trace.push({ x, y, angle });
  }

  finish(track: string): GhostLap {
    const time = (performance.now() - this.start) / 1000;
    const lap: GhostLap = { time, trace: this.trace.slice() };
    recordLap(track, lap);
    return lap;
  }
}
