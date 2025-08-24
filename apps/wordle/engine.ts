export type LetterState = 'correct' | 'present' | 'absent';

export const evaluateGuess = (guess: string, answer: string): LetterState[] => {
  const res: LetterState[] = Array(5).fill('absent');
  const ans = answer.split('');
  const used: boolean[] = Array(5).fill(false);
  for (let i = 0; i < 5; i++) {
    if (guess[i] === ans[i]) {
      res[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === 'correct') continue;
    const idx = ans.findIndex((ch, j) => !used[j] && ch === guess[i]);
    if (idx !== -1) {
      res[i] = 'present';
      used[idx] = true;
    }
  }
  return res;
};

export const validateGuess = (
  guess: string,
  allowed: string[],
): string | null => {
  if (guess.length !== 5) return 'Word must be 5 letters';
  if (!allowed.includes(guess.toLowerCase())) return 'Word not in list';
  return null;
};

export const checkHardMode = (
  guess: string,
  previousGuesses: string[],
  previousStatuses: LetterState[][],
  hardMode: boolean,
): boolean => {
  if (!hardMode) return true;
  for (let r = 0; r < previousStatuses.length; r++) {
    const s = previousStatuses[r];
    const word = previousGuesses[r];
    for (let i = 0; i < 5; i++) {
      if (s[i] === 'correct' && guess[i] !== word[i]) return false;
      if (s[i] === 'present' && !guess.includes(word[i])) return false;
    }
  }
  return true;
};
