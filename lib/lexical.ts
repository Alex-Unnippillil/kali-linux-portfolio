export interface FeatureRecord {
  [key: string]: number;
}

export function basicLexicalFeatures(text: string): FeatureRecord {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const wordCount = words.length;
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const sentenceCount = sentences.length;
  const averageWordLength = wordCount
    ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
    : 0;
  return {
    wordCount,
    uniqueWords,
    sentenceCount,
    averageWordLength: Number(averageWordLength.toFixed(2)),
  };
}

export interface AnalyzerModel {
  id: string;
  name: string;
  analyze: (text: string) => FeatureRecord;
}

export const models: AnalyzerModel[] = [
  { id: 'basic', name: 'Basic', analyze: basicLexicalFeatures },
  {
    id: 'advanced',
    name: 'Advanced',
    analyze: (text: string) => {
      const base = basicLexicalFeatures(text);
      const vowels = (text.match(/[aeiouAEIOU]/g) || []).length;
      return { ...base, vowelCount: vowels };
    },
  },
];

export function getModel(id: string): AnalyzerModel {
  return models.find((m) => m.id === id) || models[0];
}
