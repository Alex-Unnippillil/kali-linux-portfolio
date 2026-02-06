'use client';

import React, { useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import templates from './lootTemplates.json';

interface LootArtifact {
  id: string;
  host: string;
  type: string;
  path?: string;
  data?: string;
}

const artifacts = templates as LootArtifact[];

const LootViewer: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [favorites, setFavorites] = usePersistentState<string[]>(
    'metasploit:loot:favorites',
    [],
    (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  );

  const artifact = artifacts[index];
  const total = artifacts.length;

  const prev = () => setIndex((i) => (i === 0 ? total - 1 : i - 1));
  const next = () => setIndex((i) => (i === total - 1 ? 0 : i + 1));

  if (!artifact) {
    return null;
  }

  const isFavorite = favorites.includes(artifact.id);
  const toggleFavorite = () => {
    setFavorites((f) =>
      f.includes(artifact.id)
        ? f.filter((id) => id !== artifact.id)
        : [...f, artifact.id],
    );
  };

  return (
    <div className="p-4 text-sm bg-ub-grey flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button onClick={prev} className="px-2 py-1 bg-ub-orange rounded">Prev</button>
        <span>
          {index + 1} / {total}
        </span>
        <button onClick={next} className="px-2 py-1 bg-ub-orange rounded">Next</button>
      </div>
      <div className="bg-black text-green-400 p-2 rounded">
        <p>
          <strong>Host:</strong> {artifact.host}
        </p>
        <p>
          <strong>Type:</strong> {artifact.type}
        </p>
        {artifact.path && (
          <p>
            <strong>Path:</strong> {artifact.path}
          </p>
        )}
        {artifact.data && (
          <p>
            <strong>Data:</strong> {artifact.data}
          </p>
        )}
      </div>
      <button
        onClick={toggleFavorite}
        className={`px-2 py-1 rounded ${
          isFavorite ? 'bg-yellow-400' : 'bg-ub-grey'
        }`}
      >
        {isFavorite ? '★ Favorited' : '☆ Favorite'}
      </button>
    </div>
  );
};

export default LootViewer;
