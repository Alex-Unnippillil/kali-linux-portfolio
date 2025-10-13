export const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Letters that appear most frequently in English words.
export const COMMON_LETTERS = [
  'e',
  't',
  'a',
  'o',
  'i',
  'n',
  's',
  'h',
  'r',
  'd',
  'l',
  'u',
];

export const getGuessPool = (excludeCommon = false): string[] =>
  excludeCommon
    ? ALL_LETTERS.filter((l) => !COMMON_LETTERS.includes(l))
    : [...ALL_LETTERS];
