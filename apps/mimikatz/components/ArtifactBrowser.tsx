'use client';

import React, { useMemo, useState } from 'react';
import artifactsData from '../data/artifacts.json';

interface Artifact {
  name: string;
  value?: string;
  children?: Artifact[];
}

const filterNode = (node: Artifact, q: string): Artifact | null => {
  const match = node.name.toLowerCase().includes(q);
  const children = node.children
    ?.map((child) => filterNode(child, q))
    .filter((c): c is Artifact => Boolean(c));
  if (match || (children && children.length)) {
    return { ...node, children };
  }
  return null;
};

const TreeNode: React.FC<{ node: Artifact }> = ({ node }) => {
  const hasChildren = node.children && node.children.length > 0;
  if (hasChildren) {
    return (
      <li>
        <details>
          <summary className="cursor-pointer select-none">{node.name}</summary>
          <ul className="pl-4">
            {node.children!.map((c) => (
              <TreeNode key={c.name} node={c} />
            ))}
          </ul>
        </details>
      </li>
    );
  }
  return (
    <li>
      <span>
        {node.name}
        {node.value ? `: ${node.value}` : ''}
      </span>
    </li>
  );
};

const ArtifactBrowser: React.FC = () => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artifactsData as Artifact[];
    return (artifactsData as Artifact[])
      .map((n) => filterNode(n, q))
      .filter((n): n is Artifact => Boolean(n));
  }, [query]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen overflow-auto">
      <h1 className="text-xl mb-2">Hive Artifacts</h1>
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 p-1 w-full text-black"
      />
      <ul>
        {filtered.map((node) => (
          <TreeNode key={node.name} node={node} />
        ))}
      </ul>
    </div>
  );
};

export default ArtifactBrowser;
