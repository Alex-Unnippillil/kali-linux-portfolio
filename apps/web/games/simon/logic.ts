export interface SimonState {
  /** remaining lives for the player */
  lives: number;
  /** current difficulty level */
  difficulty: number;
  /** seconds remaining before the next round starts */
  countdown: number;
  /** whether strict mode is enabled */
  strict: boolean;
  /** current speed level */
  speed: number;
}

export const INITIAL_LIVES = 3;
export const INITIAL_DIFFICULTY = 1;
export const INITIAL_SPEED = 1;

/**
 * Create a new Simon game state.
 */
export const createState = (
  lives: number = INITIAL_LIVES,
  difficulty: number = INITIAL_DIFFICULTY,
  strict = false,
  speed: number = INITIAL_SPEED,
): SimonState => ({ lives, difficulty, countdown: 0, strict, speed });

/**
 * Begin a round countdown.
 *
 * @param state Current game state
 * @param seconds Number of seconds before the round begins
 */
export const startCountdown = (
  state: SimonState,
  seconds: number,
): SimonState => ({ ...state, countdown: seconds });

/**
 * Advance the countdown timer by one second.
 */
export const tick = (state: SimonState): SimonState => ({
  ...state,
  countdown: Math.max(0, state.countdown - 1),
});

/**
 * Decrease a life and automatically adjust difficulty.
 */
export const loseLife = (state: SimonState): SimonState => {
  if (state.strict) {
    // restart the game when strict mode is enabled
    return createState(INITIAL_LIVES, INITIAL_DIFFICULTY, true, INITIAL_SPEED);
  }
  const lives = Math.max(0, state.lives - 1);
  return { ...state, lives, difficulty: adjustDifficulty(state.difficulty, lives) };
};

/**
 * Increase a life and automatically adjust difficulty.
 */
export const gainLife = (state: SimonState): SimonState => {
  const lives = state.lives + 1;
  return {
    ...state,
    lives,
    difficulty: adjustDifficulty(state.difficulty, lives),
    speed: state.speed + 1,
  };
};

/**
 * Compute a new difficulty based on the current number of lives.
 *
 * The game becomes slightly easier when the player is down to a single life
 * and ramps up again as more lives are available.
 */
export const adjustDifficulty = (current: number, lives: number): number => {
  if (lives <= 1) return Math.max(1, current - 1);
  return current + 1;
};

/**
 * Helper to determine if the game has ended.
 */
export const isGameOver = (state: SimonState): boolean => state.lives === 0;

/**
 * Advance to the next level and increase speed.
 */
export const nextLevel = (state: SimonState): SimonState => ({
  ...state,
  difficulty: state.difficulty + 1,
  speed: state.speed + 1,
});

