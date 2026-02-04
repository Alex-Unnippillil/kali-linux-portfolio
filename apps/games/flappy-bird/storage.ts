import { recordRun, loadBestRun } from '../../../games/flappy-bird/ghost';

export const STORAGE_KEYS = {
  birdSkin: 'flappy-bird-skin',
  pipeSkin: 'flappy-pipe-skin',
  gravity: 'flappy-gravity-variant',
  practice: 'flappy-practice',
  ghost: 'flappy-ghost',
  reducedMotion: 'flappy-reduced-motion',
  highHz: 'flappy-120hz',
  hitbox: 'flappy-hitbox',
  highScore: 'flappy-bird-highscore',
} as const;

const LEGACY_RECORDS_KEY = 'flappy-records';
const LEGACY_HIGHSCORE_KEY = 'flappy-highscore';

const readValue = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const readNumber = (
  key: string,
  fallback: number,
  { min = 0, max = Number.POSITIVE_INFINITY } = {},
) => {
  const raw = readValue(key);
  const parsed = raw === null ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
};

export const readBoolean = (key: string, fallback: boolean) => {
  const raw = readValue(key);
  if (raw === null) return fallback;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return fallback;
};

export const writeValue = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore write errors
  }
};

export const readHighScore = () => readNumber(STORAGE_KEYS.highScore, 0);

export const writeHighScore = (score: number) => {
  writeValue(STORAGE_KEYS.highScore, String(score));
};

export const migrateLegacyFlappyRecords = (gravityNames: string[]) => {
  if (typeof window === 'undefined') return;
  let legacyRecords: Record<string, any> | null = null;
  try {
    legacyRecords = JSON.parse(readValue(LEGACY_RECORDS_KEY) || 'null');
  } catch {
    legacyRecords = null;
  }

  let migrated = false;
  if (legacyRecords && typeof legacyRecords === 'object') {
    gravityNames.forEach((name) => {
      const legacy = legacyRecords?.[name];
      if (!legacy || !legacy.run?.pos || !Array.isArray(legacy.run.pos)) return;
      if (loadBestRun(name)) return;
      const score = Number(legacy.score) || 0;
      recordRun(name, { score, pos: legacy.run.pos });
      migrated = true;
    });
  }

  if (readHighScore() === 0) {
    const legacyHighScore = readNumber(LEGACY_HIGHSCORE_KEY, 0);
    if (legacyHighScore > 0) {
      writeHighScore(legacyHighScore);
      migrated = true;
    }
  }

  return migrated;
};
