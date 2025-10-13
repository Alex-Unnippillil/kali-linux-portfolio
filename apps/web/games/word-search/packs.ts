export const PUZZLE_PACKS: Record<string, string[]> = {
  animals: ['DOG', 'CAT', 'EAGLE', 'TIGER', 'HORSE', 'SHARK', 'SNAKE', 'LION'],
  fruits: ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MANGO', 'LEMON', 'PEACH', 'CHERRY'],
  colors: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'BLACK', 'WHITE'],
  tech: ['REACT', 'CODE', 'TAILWIND', 'NODE', 'JAVASCRIPT', 'HTML', 'CSS', 'PYTHON'],
};
export type PackName = keyof typeof PUZZLE_PACKS;
