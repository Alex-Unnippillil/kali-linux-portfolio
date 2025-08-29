// Utility helpers for the memory game

/**
 * Generate a list of card values for the given board size.
 * The board contains pairs of items, so size must be even.
 *
 * @param size number of rows/cols in the square board
 */
export function generateBoard(size: number): string[] {
  const total = size * size;
  const pairs = total / 2;
  const values: string[] = [];

  // simple sequence of letters starting from A
  for (let i = 0; i < pairs; i++) {
    const letter = String.fromCharCode(65 + (i % 26));
    values.push(letter, letter);
  }

  // shuffle using Fisher-Yates
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  return values;
}
