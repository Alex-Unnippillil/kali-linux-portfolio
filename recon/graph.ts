export interface Relationship {
  source: string;
  target: string;
  type?: string;
}

export interface AggregatedGraph {
  nodes: { id: string }[];
  links: { source: string; target: string; type?: string; count: number }[];
}

/**
 * Aggregate raw relationships into a simple graph structure.
 * Duplicate nodes are removed and identical links are counted.
 */
export function aggregateRelationships(
  rels: Relationship[],
): AggregatedGraph {
  const nodes = new Map<string, { id: string }>();
  const links = new Map<string, {
    source: string;
    target: string;
    type?: string;
    count: number;
  }>();

  rels.forEach((r) => {
    nodes.set(r.source, { id: r.source });
    nodes.set(r.target, { id: r.target });
    const key = `${r.source}->${r.target}${r.type ? `:${r.type}` : ''}`;
    const existing = links.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      links.set(key, {
        source: r.source,
        target: r.target,
        type: r.type,
        count: 1,
      });
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    links: Array.from(links.values()),
  };
}
