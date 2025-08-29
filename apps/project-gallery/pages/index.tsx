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

  const [stack, setStack] = usePersistentState<string>('pg-stack', '');
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
    const { stack: qsStack, year: qsYear, type: qsType, tags: qsTags } = router.query;
    if (typeof qsStack === 'string') setStack(qsStack);
    if (typeof qsYear === 'string') setYear(qsYear);
    if (typeof qsType === 'string') setType(qsType);
    if (typeof qsTags === 'string') setTags(qsTags.split(','));
  }, [router.isReady]);

  // encode selection in query string
  useEffect(() => {
    const query: Record<string, string> = {};
    if (stack) query.stack = stack;
    if (year) query.year = year;
    if (type) query.type = type;
    if (tags.length) query.tags = tags.join(',');
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [stack, year, type, tags]);

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
          (!stack || p.stack.includes(stack)) &&
          (!year || String(p.year) === year) &&
          (!type || p.type === type) &&
          (!tags.length || tags.every((t) => p.tags.includes(t)))
      ),
    [projects, stack, year, type, tags]
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
            onClick={() => setStack(stack === s ? '' : s)}
            className={pillClass(stack === s)}
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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.id} className="border rounded overflow-hidden">
            <img src={p.thumbnail} alt={p.title} className="w-full h-40 object-cover" />
            <div className="p-2">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm">{p.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

