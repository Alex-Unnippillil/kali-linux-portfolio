export interface GhostRun {
  /** Final score of the run */
  score: number;
  /** Recorded bird Y positions for each frame */
  pos: number[];
}

const ghostKey = (gravity: string) => `flappy-bird-ghosts-${gravity}`;
const bestKey = (gravity: string) => `flappy-bird-best-${gravity}`;

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null') as T | null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/** Load all ghost runs stored for a given gravity variant. */
export function loadGhosts(gravity: string): GhostRun[] {
  return read<GhostRun[]>(ghostKey(gravity)) || [];
}

/** Persist ghost runs for a gravity variant. */
function saveGhosts(gravity: string, ghosts: GhostRun[]): void {
  write(ghostKey(gravity), ghosts);
}

/**
 * Save a completed run, keeping the list sorted by best score (descending).
 * The best run is cached separately for quick access.
 */
export function recordRun(gravity: string, run: GhostRun): void {
  const ghosts = loadGhosts(gravity);
  ghosts.push(run);
  ghosts.sort((a, b) => b.score - a.score);
  saveGhosts(gravity, ghosts);
  write(bestKey(gravity), ghosts[0]);
}

/** Retrieve the best run recorded for a gravity variant. */
export function loadBestRun(gravity: string): GhostRun | null {
  return read<GhostRun>(bestKey(gravity));
}

/** Retrieve a specific ghost run by index. */
export function getGhost(gravity: string, index: number): GhostRun | null {
  const ghosts = loadGhosts(gravity);
  return ghosts[index] || null;
}

/** List available ghost options as an array of scores. */
export function listGhostOptions(gravity: string): number[] {
  return loadGhosts(gravity).map((g) => g.score);
}

/**
 * Helper used while recording a run. Call {@link record} every frame with the
 * bird's Y position, then {@link finish} when the game ends. The run will be
 * stored automatically if it is among the best.
 */
export class GhostRecorder {
  private pos: number[] = [];

  start(): void {
    this.pos = [];
  }

  record(y: number): void {
    this.pos.push(y);
  }

  finish(gravity: string, score: number): GhostRun {
    const run: GhostRun = { score, pos: this.pos.slice() };
    recordRun(gravity, run);
    return run;
  }
}

export default GhostRecorder;
