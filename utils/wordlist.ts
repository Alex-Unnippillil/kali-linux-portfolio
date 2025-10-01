export interface WordlistSummary {
  entries: string[];
  uniqueCount: number;
  totalEntries: number;
  emptyLinesRemoved: number;
  duplicatesRemoved: number;
}

export const normalizeWordlist = (input: string): WordlistSummary => {
  if (!input) {
    return {
      entries: [],
      uniqueCount: 0,
      totalEntries: 0,
      emptyLinesRemoved: 0,
      duplicatesRemoved: 0,
    };
  }

  const rawLines = input.split(/\r?\n/);
  let emptyLinesRemoved = 0;
  const cleanedLines: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      emptyLinesRemoved += 1;
      continue;
    }
    cleanedLines.push(trimmed);
  }

  const uniqueEntries: string[] = [];
  const seen = new Set<string>();

  cleanedLines.forEach((line) => {
    if (!seen.has(line)) {
      seen.add(line);
      uniqueEntries.push(line);
    }
  });

  const duplicatesRemoved = cleanedLines.length - uniqueEntries.length;

  return {
    entries: uniqueEntries,
    uniqueCount: uniqueEntries.length,
    totalEntries: cleanedLines.length,
    emptyLinesRemoved,
    duplicatesRemoved,
  };
};
