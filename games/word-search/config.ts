export type TimerMode = 'countup' | 'countdown';

export interface DifficultyConfig {
  readonly label: string;
  readonly description: string;
  readonly size: number;
  readonly wordCount: number;
  readonly allowDiagonal: boolean;
  readonly allowBackwards: boolean;
  readonly timer: {
    readonly mode: TimerMode;
    readonly limit?: number;
  };
}

export type DifficultyKey = 'easy' | 'standard' | 'hard' | 'expert';

export const DIFFICULTIES: Record<DifficultyKey, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    description: 'Smaller grid with only forward words – a great warm up.',
    size: 8,
    wordCount: 6,
    allowDiagonal: false,
    allowBackwards: false,
    timer: {
      mode: 'countup',
    },
  },
  standard: {
    label: 'Standard',
    description: 'Classic 12×12 grid with orthogonal and diagonal placements.',
    size: 12,
    wordCount: 8,
    allowDiagonal: true,
    allowBackwards: true,
    timer: {
      mode: 'countup',
    },
  },
  hard: {
    label: 'Hard',
    description: 'Larger grid with diagonal words and a countdown timer.',
    size: 14,
    wordCount: 10,
    allowDiagonal: true,
    allowBackwards: true,
    timer: {
      mode: 'countdown',
      limit: 240,
    },
  },
  expert: {
    label: 'Expert',
    description: 'Maximum difficulty with dense 16×16 grids and a rapid timer.',
    size: 16,
    wordCount: 12,
    allowDiagonal: true,
    allowBackwards: true,
    timer: {
      mode: 'countdown',
      limit: 180,
    },
  },
};

export const DEFAULT_DIFFICULTY: DifficultyKey = 'standard';

export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as DifficultyKey[];

export const getDifficultyConfig = (
  difficulty: DifficultyKey | string,
): DifficultyConfig => {
  if (typeof difficulty === 'string' && difficulty in DIFFICULTIES) {
    return DIFFICULTIES[difficulty as DifficultyKey];
  }
  return DIFFICULTIES[DEFAULT_DIFFICULTY];
};

