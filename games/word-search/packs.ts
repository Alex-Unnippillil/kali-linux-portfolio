export interface WordPack {
  readonly label: string;
  readonly language: string;
  readonly words: string[];
  readonly source: string;
}

export const PUZZLE_PACKS: Record<string, WordPack> = {
  animals: {
    label: 'Animals',
    language: 'en',
    words: ['DOG', 'CAT', 'EAGLE', 'TIGER', 'HORSE', 'SHARK', 'SNAKE', 'LION'],
    source: 'Curated list of common animal names used in elementary vocabulary lessons.',
  },
  fruits: {
    label: 'Fruits',
    language: 'en',
    words: ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MANGO', 'LEMON', 'PEACH', 'CHERRY'],
    source: 'Curated from USDA “Kids’ Zone” nutrition activities (public domain).',
  },
  colors: {
    label: 'Colors',
    language: 'en',
    words: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'BLACK', 'WHITE'],
    source: 'Derived from the W3C HTML color keyword list to keep terminology consistent.',
  },
  tech: {
    label: 'Tech',
    language: 'en',
    words: ['REACT', 'CODE', 'TAILWIND', 'NODE', 'JAVASCRIPT', 'HTML', 'CSS', 'PYTHON'],
    source: 'Selected from the project’s own stack and popular introductory programming topics.',
  },
};
export type PackName = keyof typeof PUZZLE_PACKS;
