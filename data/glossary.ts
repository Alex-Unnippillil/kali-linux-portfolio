export interface GlossaryEntry {
  name: string;
  description: string;
  links: string[];
}

export const GLOSSARY: GlossaryEntry[] = [
  { name: 'root', description: 'Root term', links: [] },
  { name: 'term1', description: '', links: ['root'] },
  { name: 'term2', description: '', links: ['root'] },
  { name: 'term3', description: '', links: ['root'] },
  { name: 'term4', description: '', links: ['root'] },
  { name: 'term5', description: '', links: ['root'] },
  { name: 'term6', description: '', links: ['root'] },
  { name: 'term7', description: '', links: ['root'] },
  { name: 'term8', description: '', links: ['root'] },
  { name: 'term9', description: '', links: ['root'] },
  { name: 'term10', description: '', links: ['root'] },
  { name: 'term11', description: '', links: ['root'] },
  { name: 'term12', description: '', links: ['root'] },
  { name: 'term13', description: '', links: ['root'] },
  { name: 'term14', description: '', links: ['root'] },
  { name: 'term15', description: '', links: ['root'] },
  { name: 'term16', description: '', links: ['root'] },
  { name: 'term17', description: '', links: ['root'] },
  { name: 'term18', description: '', links: ['root'] },
  { name: 'term19', description: '', links: ['root'] },
  { name: 'term20', description: '', links: ['root'] },
  { name: 'term21', description: '', links: ['root'] },
  { name: 'term22', description: '', links: ['root'] },
  { name: 'term23', description: '', links: ['root'] },
  { name: 'term24', description: '', links: ['root'] },
  { name: 'term25', description: '', links: ['root'] },
  { name: 'term26', description: '', links: ['root'] },
];

export function getGlossaryMap(): Record<string, GlossaryEntry> {
  return Object.fromEntries(GLOSSARY.map((t) => [t.name, t]));
}
