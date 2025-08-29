'use client';

import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
}

export default function ProjectGalleryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  const [tech, setTech] = usePersistentState<string[]>('pg-tech', []);
  const [year, setYear] = usePersistentState<string>('pg-year', '');
  const [type, setType] = usePersistentState<string>('pg-type', '');
  const [tags, setTags] = usePersistentState<string[]>('pg-tags', []);

  // load projects
  useEffect(() => {
    fetch('/projects.json')
      .then((r) => r.json())
      .then((data) => setProjects(data as Project[]))
      .catch(() => setProjects([]));
  }, []);

  // initialize from query string
  useEffect(() => {
    if (!router.isReady) return;
    const { tech: qsTech, year: qsYear, type: qsType, tags: qsTags } = router.query;
    if (typeof qsTech === 'string') setTech(qsTech.split(','));
    if (typeof qsYear === 'string') setYear(qsYear);
    if (typeof qsType === 'string') setType(qsType);
    if (typeof qsTags === 'string') setTags(qsTags.split(','));
  }, [router.isReady, router.query, setTech, setYear, setType, setTags]);

  // encode selection in query string
  useEffect(() => {
    const query: Record<string, string> = {};
    if (tech.length) query.tech = tech.join(',');
    if (year) query.year = year;
    if (type) query.type = type;
    if (tags.length) query.tags = tags.join(',');
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router, tech, year, type, tags]);

  const stacks = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.stack))),
    [projects]
  );
  const years = useMemo(
    () => Array.from(new Set(projects.map((p) => p.year))).sort((a, b) => b - a),
    [projects]
  );
  const types = useMemo(
    () => Array.from(new Set(projects.map((p) => p.type))),
    [projects]
  );
  const tagList = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tags))),
    [projects]
  );

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!tech.length || tech.every((t) => p.stack.includes(t))) &&
          (!year || String(p.year) === year) &&
          (!type || p.type === type) &&
          (!tags.length || tags.every((t) => p.tags.includes(t)))
      ),
    [projects, tech, year, type, tags]
  );

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full border ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`;

  return (
    <div className="p-4 space-y-4 text-black">
      <div className="flex flex-wrap gap-2">
        {tagList.map((t) => (
          <button
            key={t}
            onClick={() =>
              setTags(tags.includes(t) ? tags.filter((tag) => tag !== t) : [...tags, t])
            }
            className={pillClass(tags.includes(t))}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {stacks.map((s) => (
          <button
            key={s}
            onClick={() =>
              setTech(tech.includes(s) ? tech.filter((t) => t !== s) : [...tech, s])
            }
            className={pillClass(tech.includes(s))}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(year === String(y) ? '' : String(y))}
            className={pillClass(year === String(y))}
          >
            {y}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(type === t ? '' : t)}
            className={pillClass(type === t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            tabIndex={0}
            className="group relative h-72 flex flex-col border rounded overflow-hidden transition-transform transition-opacity duration-300 hover:scale-105 hover:opacity-90 focus:scale-105 focus:opacity-90 focus:outline-none"
            aria-label={`${p.title}: ${p.description}`}
          >
            <img src={p.thumbnail} alt={p.title} className="w-full h-40 object-cover" />
            <div className="p-2 flex-1">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm">{p.description}</p>
            </div>
            <div className="absolute inset-0 opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity bg-black/60 text-white flex flex-col">
              <div className="p-2 flex flex-wrap gap-1">
                {p.tags.map((t) => (
                  <span key={t} className="bg-white text-black rounded px-1 text-xs">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-auto p-2 text-right">
                <button className="bg-blue-600 text-white px-2 py-1 rounded">
                  Quick view
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

