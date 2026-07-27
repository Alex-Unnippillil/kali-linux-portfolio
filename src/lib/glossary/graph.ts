import type { GlossaryEntry } from '@/data/glossary';

export interface GlossaryGraph {
  /**
   * Map of a term to a list of terms that reference it.
   */
  references: Record<string, string[]>;
}

/**
 * Build a graph of glossary entries, capturing which terms reference others.
 * @param entries Array of glossary entries.
 */
export function buildGlossaryGraph(entries: GlossaryEntry[]): GlossaryGraph {
  const graph: GlossaryGraph = { references: {} };
  for (const entry of entries) {
    for (const link of entry.links) {
      if (!graph.references[link]) {
        graph.references[link] = [];
      }
      graph.references[link].push(entry.name);
    }
    if (!graph.references[entry.name]) {
      graph.references[entry.name] = [];
    }
  }
  return graph;
}
