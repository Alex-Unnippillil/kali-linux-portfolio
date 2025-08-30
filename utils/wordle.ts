import commonWords from '../components/apps/wordle_words.json';
import altWords from '../components/apps/wordle_words_alt.json';
import animalWords from '../components/apps/wordle_words_animals.json';
import fruitWords from '../components/apps/wordle_words_fruits.json';
import { getDailySeed } from './dailyChallenge';

export type DictName = 'common' | 'alt' | 'animals' | 'fruits';

const dictionaries: Record<DictName, string[]> = {
  common: commonWords as string[],
  alt: altWords as string[],
  animals: animalWords as string[],
  fruits: fruitWords as string[],
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return Math.abs(h);
}

export function getWordOfTheDay(
  dict: DictName = 'common',
  date: Date = new Date()
): string {
  const wordList = dictionaries[dict];
  const seed = getDailySeed(`wordle-${dict}`, date);
  return wordList[hash(seed) % wordList.length];
}

type LetterResult = 'correct' | 'present' | 'absent';
export function buildResultMosaic(
  results: LetterResult[][],
  colorBlind = false
): string {
  const emojiMap = colorBlind
    ? { correct: '🟦', present: '🟧', absent: '⬛' }
    : { correct: '🟩', present: '🟨', absent: '⬛' };
  return results
    .map((row) => row.map((r) => emojiMap[r]).join(''))
    .join('\n');
}

export { dictionaries };
