export type LetterResult = 'correct' | 'present' | 'absent';

export interface GuessEntry {
  guess: string;
  result: LetterResult[];
}

/**
 * Evaluate a guess against the solution producing a result for each letter.
 * Mimics the classic Wordle scoring rules.
 */
export function evaluateGuess(guess: string, answer: string): LetterResult[] {
  const result: LetterResult[] = Array(5).fill('absent');
  const answerArr = answer.split('');
  const used = Array(5).fill(false);

  // First pass for correct placements
  for (let i = 0; i < 5; i += 1) {
    if (guess[i] === answerArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Second pass for present letters
  for (let i = 0; i < 5; i += 1) {
    if (result[i] === 'correct') continue;
    const ch = guess[i];
    const idx = answerArr.findIndex((a, j) => !used[j] && a === ch);
    if (idx !== -1) {
      result[i] = 'present';
      used[idx] = true;
    }
  }

  return result;
}

/**
 * Enforce Wordle hard mode rules. Any letter revealed in previous guesses must
 * be used in subsequent guesses.
 *
 * Returns an error message string if the guess violates hard mode, otherwise
 * null.
 */
export function hardModeViolation(
  guess: string,
  previous: GuessEntry[],
): string | null {
  const requiredPos: Record<number, string> = {};
  const forbiddenPos: Record<number, Set<string>> = {};
  const requiredCounts: Record<string, number> = {};

  previous.forEach(({ guess: g, result }) => {
    const localCounts: Record<string, number> = {};
    for (let i = 0; i < 5; i += 1) {
      const ch = g[i];
      const res = result[i];
      if (res === 'correct') {
        requiredPos[i] = ch;
        localCounts[ch] = (localCounts[ch] || 0) + 1;
      } else if (res === 'present') {
        forbiddenPos[i] = forbiddenPos[i] || new Set();
        forbiddenPos[i]!.add(ch);
        localCounts[ch] = (localCounts[ch] || 0) + 1;
      }
    }
    Object.entries(localCounts).forEach(([ch, count]) => {
      requiredCounts[ch] = Math.max(requiredCounts[ch] || 0, count);
    });
  });

  for (const [idxStr, ch] of Object.entries(requiredPos)) {
    const idx = Number(idxStr);
    if (guess[idx] !== ch) {
      return `Hard mode: ${ch} must be in position ${idx + 1}.`;
    }
  }

  const guessCounts: Record<string, number> = {};
  for (let i = 0; i < 5; i += 1) {
    const ch = guess[i];
    guessCounts[ch] = (guessCounts[ch] || 0) + 1;
    if (forbiddenPos[i] && forbiddenPos[i]!.has(ch)) {
      return `Hard mode: ${ch} cannot be in position ${i + 1}.`;
    }
  }

  for (const [ch, count] of Object.entries(requiredCounts)) {
    if ((guessCounts[ch] || 0) < count) {
      return `Hard mode: guess must contain ${ch}${count > 1 ? ` (${count}x)` : ''}.`;
    }
  }

  return null;
}

const wordleLogic = { evaluateGuess, hardModeViolation };

export default wordleLogic;

