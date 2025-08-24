import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import projects from '../../data/projects.json';
import type { Project } from '../../lib/types';

const ProjectGallery: React.FC = () => {
  const [tag, setTag] = useState('All');

  const tags = useMemo(() => {
    return ['All', ...Array.from(new Set((projects as Project[]).flatMap(p => p.tags)))];
  }, []);

  const filtered = useMemo(() => {
    return tag === 'All'
      ? (projects as Project[])
      : (projects as Project[]).filter(p => p.tags.includes(tag));
  }, [tag]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`px-3 py-1 rounded ${t === tag ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((p, i) => (
          <div key={i} className="border rounded overflow-hidden">
            <Image
              src={p.image}
              alt={p.title}
              width={400}
              height={300}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
            <div className="p-2">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{p.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectGallery;
