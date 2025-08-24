export interface WordEntry {
  word: string;
  freq: number;
}

export type Dictionary = {
  easy: WordEntry[];
  medium: WordEntry[];
  hard: WordEntry[];
};

// Build dictionary categorized by frequency and length
export const buildDictionary = (words: WordEntry[]): Dictionary => {
  const dict: Dictionary = { easy: [], medium: [], hard: [] };
  words.forEach((w) => {
    const len = w.word.length;
    if (w.freq >= 4000 && len <= 6) {
      dict.easy.push(w);
    } else if (w.freq >= 1000 && w.freq < 4000 && len <= 9) {
      dict.medium.push(w);
    } else {
      dict.hard.push(w);
    }
  });
  return dict;
};

// Select a random word excluding those already used
export const selectWord = (words: WordEntry[], used: string[] = []): WordEntry => {
  let available = words.filter((w) => !used.includes(w.word));
  if (available.length === 0) available = words;
  return available[Math.floor(Math.random() * available.length)];
};
