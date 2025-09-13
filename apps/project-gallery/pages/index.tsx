'use client';

import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import FilterChip from '../components/FilterChip';

const TagIcon = () => (
  <svg
    className="w-6 h-6"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

const StackIcon = () => (
  <svg
    className="w-6 h-6"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="w-6 h-6"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
    />
  </svg>
);

const TypeIcon = () => (
  <svg
    className="w-6 h-6"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z"
    />
  </svg>
);

const PlayIcon = () => (
  <svg
    className="w-6 h-6"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.25v13.5L18.75 12 5.25 5.25Z"
    />
  </svg>
);

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  demo?: string;
}

export default function ProjectGalleryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [tech, setTech] = usePersistentState<string[]>('pg-tech', []);
  const [year, setYear] = usePersistentState<string>('pg-year', '');
  const [type, setType] = usePersistentState<string>('pg-type', '');
  const [tags, setTags] = usePersistentState<string[]>('pg-tags', []);
  const [search, setSearch] = usePersistentState<string>('pg-search', '');
  const [demoOnly, setDemoOnly] = usePersistentState<boolean>('pg-demo', false);

  // load projects
  useEffect(() => {
    setLoading(true);
    fetch('/projects.json')
      .then((r) => r.json())
      .then((data) => setProjects(data as Project[]))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  // initialize from query string
  useEffect(() => {
    if (!router.isReady) return;
    const {
      tech: qsTech,
      year: qsYear,
      type: qsType,
      tags: qsTags,
      q: qsSearch,
      demo: qsDemo,
    } = router.query;
    if (typeof qsTech === 'string') setTech(qsTech.split(','));
    if (typeof qsYear === 'string') setYear(qsYear);
    if (typeof qsType === 'string') setType(qsType);
    if (typeof qsTags === 'string') setTags(qsTags.split(','));
    if (typeof qsSearch === 'string') setSearch(qsSearch);
    if (typeof qsDemo === 'string') setDemoOnly(qsDemo === '1');
  }, [
    router.isReady,
    router.query,
    setTech,
    setYear,
    setType,
    setTags,
    setSearch,
    setDemoOnly,
  ]);

  // encode selection in query string
  useEffect(() => {
    const query: Record<string, string> = {};
    if (tech.length) query.tech = tech.join(',');
    if (year) query.year = year;
    if (type) query.type = type;
    if (tags.length) query.tags = tags.join(',');
    if (search) query.q = search;
    if (demoOnly) query.demo = '1';
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router, tech, year, type, tags, search, demoOnly]);

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
          (!tags.length || tags.every((t) => p.tags.includes(t))) &&
          (!search ||
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase())) &&
          (!demoOnly || Boolean(p.demo))
      ),
    [projects, tech, year, type, tags, search, demoOnly]
  );

  return (
    <div className="p-4 space-y-4 text-black">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        <FilterChip
          label="Playable"
          active={demoOnly}
          onClick={() => setDemoOnly(!demoOnly)}
          icon={<PlayIcon />}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {tagList.map((t) => (
          <FilterChip
            key={t}
            label={t}
            active={tags.includes(t)}
            onClick={() =>
              setTags(tags.includes(t) ? tags.filter((tag) => tag !== t) : [...tags, t])
            }
            icon={<TagIcon />}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {stacks.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={tech.includes(s)}
            onClick={() =>
              setTech(tech.includes(s) ? tech.filter((t) => t !== s) : [...tech, s])
            }
            icon={<StackIcon />}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {years.map((y) => (
          <FilterChip
            key={y}
            label={String(y)}
            active={year === String(y)}
            onClick={() => setYear(year === String(y) ? '' : String(y))}
            icon={<CalendarIcon />}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <FilterChip
            key={t}
            label={t}
            active={type === t}
            onClick={() => setType(type === t ? '' : t)}
            icon={<TypeIcon />}
          />
        ))}
      </div>
      <div className="grid gap-3 min-[320px]:grid-cols-2 md:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 flex flex-col border rounded overflow-hidden animate-pulse"
              >
                <div className="w-full h-40 bg-gray-300" />
                <div className="p-2 space-y-2 flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4" />
                  <div className="h-3 bg-gray-300 rounded w-1/2" />
                </div>
              </div>
            ))
          : filtered.map((p) => (
              <div
                key={p.id}
                tabIndex={0}
                className="group relative h-72 flex flex-col border rounded overflow-hidden transition-transform transition-opacity duration-300 hover:scale-105 hover:opacity-90 focus:scale-105 focus:opacity-90 focus:outline-none"
                aria-label={`${p.title}: ${p.description}`}
              >
                <div className="w-full aspect-video overflow-hidden">
                  <img loading="lazy" src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-2 flex-1">
                  <h3 className="font-semibold text-base line-clamp-2">{p.title}</h3>
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
                    <button className="bg-blue-600 text-white px-4 h-10 rounded">Launch</button>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

