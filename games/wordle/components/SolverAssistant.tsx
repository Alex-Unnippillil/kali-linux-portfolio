'use client';

import { useMemo } from 'react';
import { dictionaries } from '@/utils';

type DictName = keyof typeof dictionaries;

type LetterResult = 'correct' | 'present' | 'absent';

interface GuessResult {
  guess: string;
  result: LetterResult[];
}

interface SolverAssistantProps {
  guesses: GuessResult[];
  dictName?: DictName;
}

function evaluateGuess(guess: string, answer: string): LetterResult[] {
  const res: LetterResult[] = Array(5).fill('absent');
  const ans = answer.split('');
  const used = Array(5).fill(false);

  for (let i = 0; i < 5; i += 1) {
    if (guess[i] === ans[i]) {
      res[i] = 'correct';
      used[i] = true;
    }
  }

  for (let i = 0; i < 5; i += 1) {
    if (res[i] === 'correct') continue;
    const idx = ans.findIndex((ch, j) => !used[j] && ch === guess[i]);
    if (idx !== -1) {
      res[i] = 'present';
      used[idx] = true;
    }
  }

  return res;
}

function analyzeGuess(guess: string, remaining: string[]) {
  const counts: Record<string, number> = {};
  remaining.forEach((w) => {
    const key = evaluateGuess(guess, w).join('');
    counts[key] = (counts[key] || 0) + 1;
  });
  const entropy = Object.values(counts).reduce((sum, c) => {
    const p = c / remaining.length;
    return sum - p * Math.log2(p);
  }, 0);
  const expected = Object.values(counts).reduce(
    (sum, c) => sum + (c * c) / remaining.length,
    0,
  );
  return { word: guess, entropy, expected };
}

export default function SolverAssistant({
  guesses,
  dictName = 'common',
}: SolverAssistantProps) {
  const wordList = dictionaries[dictName];

  const remaining = useMemo(
    () =>
      wordList.filter((word) =>
        guesses.every(
          (g) => evaluateGuess(g.guess, word).join('') === g.result.join(''),
        ),
      ),
    [guesses, wordList],
  );

  const suggestions = useMemo(() => {
    return wordList
      .filter((w) => !guesses.some((g) => g.guess === w))
      .map((w) => analyzeGuess(w, remaining))
      .sort((a, b) => b.entropy - a.entropy)
      .slice(0, 5)
      .map((s) => ({
        ...s,
        reasoning: `Entropy ${s.entropy.toFixed(2)} bits; ~${s.expected.toFixed(
          1,
        )} words expected`,
      }));
  }, [wordList, guesses, remaining]);

  if (!guesses.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-bold">Solver Suggestions</h2>
      <ul className="text-sm space-y-1">
        {suggestions.map(({ word, reasoning }) => (
          <li key={word}>
            <span className="font-mono">{word}</span> – {reasoning}
          </li>
        ))}
      </ul>
    </div>
  );
}

