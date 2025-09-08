import { z } from 'zod';

const definitionSchema = z.object({
  definition: z.string(),
});

const meaningSchema = z.object({
  definitions: z.array(definitionSchema),
});

const entrySchema = z.object({
  meanings: z.array(meaningSchema),
});

const responseSchema = z.array(entrySchema);

export type Definition = z.infer<typeof definitionSchema>;
export type DictionaryEntry = z.infer<typeof entrySchema>;

export async function fetchDictionaryEntries(word: string, apiUrl: string): Promise<DictionaryEntry[]> {
  const res = await fetch(`${apiUrl}/${encodeURIComponent(word.trim())}`);
  if (!res.ok) throw new Error('Request failed');
  const json = await res.json();
  return responseSchema.parse(json);
}

export function extractDefinitions(entries: DictionaryEntry[]): Definition[] {
  const defs: Definition[] = [];
  for (const entry of entries) {
    for (const meaning of entry.meanings) {
      defs.push(...meaning.definitions);
    }
  }
  return defs;
}

export async function fetchDefinitions(word: string, apiUrl: string): Promise<Definition[]> {
  const entries = await fetchDictionaryEntries(word, apiUrl);
  return extractDefinitions(entries);
}
