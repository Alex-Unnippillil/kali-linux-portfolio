'use client';

import Image from 'next/image';
import React from 'react';
import type { Sample } from '../samples';

interface Props {
  samples: Sample[];
  onSelect: (path: string) => void;
}

const SampleGallery: React.FC<Props> = ({ samples, onSelect }) => (
  <div className="flex space-x-2 overflow-x-auto mb-2 pb-2" role="list">
    {samples.map((s) => (
      <div
        key={s.path}
        className="flex-shrink-0 w-40 bg-gray-700 rounded p-2 text-xs"
        role="listitem"
      >
        <button
          type="button"
          onClick={() => onSelect(s.path)}
          className="w-full text-left"
        >
          <Image
            src={s.thumbnail}
            alt={`${s.label} sample thumbnail`}
            width={160}
            height={90}
            className="rounded mb-1 object-cover"
          />
          <div className="font-semibold mb-1 text-sm">{s.label}</div>
          <p className="mb-1">{s.description}</p>
        </button>
        <a
          href={s.source}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Source
        </a>
      </div>
    ))}
  </div>
);

export default SampleGallery;
