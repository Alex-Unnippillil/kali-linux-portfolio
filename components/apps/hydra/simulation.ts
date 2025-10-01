import seedrandom from 'seedrandom';

export const DEFAULT_HYDRA_SEED = 'hydra-demo';

export type HydraSimulationResult = 'attempt' | 'throttled' | 'lockout';

export interface HydraSimulationEvent {
  attempt: number;
  time: number;
  user: string;
  password: string;
  result: HydraSimulationResult;
}

export interface HydraSimulationConfig {
  seed?: string;
  userList?: string;
  passList?: string;
  backoffThreshold: number;
  lockoutThreshold: number;
}

export interface HydraSimulation {
  seed: string;
  totalAttempts: number;
  backoffThreshold: number;
  lockoutThreshold: number;
  events: HydraSimulationEvent[];
  next(attempt: number): HydraSimulationEvent | null;
}

const sanitizeList = (input: string | undefined): string[] =>
  (input || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const normalizeHydraSeed = (seed?: string): string =>
  (seed?.trim() || DEFAULT_HYDRA_SEED);

export const createHydraSimulation = ({
  seed,
  userList,
  passList,
  backoffThreshold,
  lockoutThreshold,
}: HydraSimulationConfig): HydraSimulation => {
  const normalizedSeed = normalizeHydraSeed(seed);
  const rng = seedrandom(normalizedSeed);
  const users = sanitizeList(userList);
  const passwords = sanitizeList(passList);

  const combinations: { user: string; password: string }[] = [];
  users.forEach((user) => {
    passwords.forEach((password) => {
      combinations.push({ user, password });
    });
  });

  const totalAttempts = combinations.length;
  const limit = Math.min(totalAttempts, lockoutThreshold);

  const events: HydraSimulationEvent[] = [];
  let currentTime = 0;

  for (let i = 0; i < limit; i += 1) {
    const attempt = i + 1;
    const combo = combinations[i];
    const baseDelay = 0.6 + rng() * 0.9; // 0.6s - 1.5s base delay
    const throttleMultiplier =
      attempt > backoffThreshold
        ? 1 + (attempt - backoffThreshold) * (0.5 + rng() * 0.5)
        : 1;

    currentTime += baseDelay * throttleMultiplier;
    const time = parseFloat(currentTime.toFixed(2));

    let result: HydraSimulationResult = 'attempt';
    if (attempt >= lockoutThreshold) {
      result = 'lockout';
    } else if (attempt > backoffThreshold) {
      result = 'throttled';
    }

    events.push({
      attempt,
      time,
      user: combo?.user || '',
      password: combo?.password || '',
      result,
    });
  }

  return {
    seed: normalizedSeed,
    totalAttempts,
    backoffThreshold,
    lockoutThreshold,
    events,
    next(attempt: number) {
      return events.find((event) => event.attempt === attempt) || null;
    },
  };
};
