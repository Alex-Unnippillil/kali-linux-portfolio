import {
  applyHint,
  applyGuess,
  DIFFICULTY_PRESETS,
  getMaskedWord,
  getRemainingLetters,
  newGame,
  sanitizeWordList,
} from '../apps/hangman/model';

const makeGame = (word: string, seed = 123) =>
  newGame({
    category: 'custom',
    word,
    dictionaries: { custom: [word] },
    difficulty: 'standard',
    seed,
  });

describe('hangman model', () => {
  test('phrases auto-reveal spaces and hyphens', () => {
    const game = makeGame('star wars');
    expect(getMaskedWord(game)).toBe('____ ____');
    const update = applyGuess(game, 's');
    expect(getMaskedWord(update.state)).toBe('S___ ___S');
    expect(getRemainingLetters(update.state)).not.toContain(' ');

    const hyphenGame = makeGame('spider-man');
    expect(getMaskedWord(hyphenGame)).toBe('______-___');
  });

  test('hint reveals deterministically with a seed', () => {
    const first = applyHint(makeGame('alpha', 77));
    const second = applyHint(makeGame('alpha', 77));
    expect(first.event).toEqual(second.event);
  });

  test('difficulty presets adjust attempts and hints', () => {
    const hard = newGame({
      category: 'custom',
      word: 'test',
      dictionaries: { custom: ['test'] },
      difficulty: 'hard',
      seed: 1,
    });
    const preset = DIFFICULTY_PRESETS.hard;
    expect(hard.maxWrong).toBe(preset.maxWrong);
    expect(hard.hintsRemaining).toBe(preset.hintAllowance);
    expect(hard.hintCost).toBe(preset.hintCost);
  });

  test('sanitizes imported word lists', () => {
    const result = sanitizeWordList(
      'Alpha!\n  beta\nBETA\nspider-man\n$%\na\nloooooooooooooooooooooooooooooooooooooong',
    );
    expect(result.words).toEqual(['alpha', 'beta', 'spider-man']);
  });
});
