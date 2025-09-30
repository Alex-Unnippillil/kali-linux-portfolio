'use client';

import { useRouter } from 'next/router';
import type { TouchEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  repo?: string;
}

const ACTION_WIDTH = 160;
const SWIPE_THRESHOLD = 80;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  onOpen: (project: Project) => void;
  onCompare: (project: Project) => void;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  isSelectedForCompare: boolean;
}

function ProjectCard({
  project,
  isActive,
  onOpen,
  onCompare,
  onSwipeOpen,
  onSwipeClose,
  isSelectedForCompare,
}: ProjectCardProps) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const baseOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (isDraggingRef.current) return;
    const target = isActive ? -ACTION_WIDTH : 0;
    setOffset(target);
    offsetRef.current = target;
  }, [isActive]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) {
      return;
    }
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    baseOffsetRef.current = offsetRef.current;
    isDraggingRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;

    if (!isDraggingRef.current) {
      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }
      isDraggingRef.current = true;
    }

    const nextOffset = clamp(baseOffsetRef.current + deltaX, -ACTION_WIDTH, 0);
    setOffset(nextOffset);
    offsetRef.current = nextOffset;
  };

  const handleTouchEnd = () => {
    if (!startRef.current) return;
    const shouldOpen = offsetRef.current <= -SWIPE_THRESHOLD;
    if (shouldOpen) {
      onSwipeOpen();
      setOffset(-ACTION_WIDTH);
      offsetRef.current = -ACTION_WIDTH;
    } else {
      onSwipeClose();
      setOffset(0);
      offsetRef.current = 0;
    }
    startRef.current = null;
    isDraggingRef.current = false;
  };

  const handleToggleActions = () => {
    if (isActive) {
      onSwipeClose();
      setOffset(0);
      offsetRef.current = 0;
    } else {
      onSwipeOpen();
      setOffset(-ACTION_WIDTH);
      offsetRef.current = -ACTION_WIDTH;
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 right-0 flex w-40 bg-blue-600 text-white sm:hidden">
        <button
          type="button"
          className="w-1/2 px-3 text-sm font-medium border-r border-white/20"
          onClick={() => {
            onOpen(project);
            onSwipeClose();
          }}
        >
          Open
        </button>
        <button
          type="button"
          className="w-1/2 px-3 text-sm font-medium"
          onClick={() => {
            onCompare(project);
            onSwipeClose();
          }}
          aria-pressed={isSelectedForCompare}
        >
          Compare
        </button>
      </div>
      <div
        className="bg-white border rounded-lg shadow-sm overflow-hidden transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="sm:w-48 sm:flex-none">
            <div className="aspect-video w-full overflow-hidden rounded-md bg-gray-100">
              <img src={project.thumbnail} alt={project.title} className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                <p className="text-sm text-gray-600">{project.description}</p>
              </div>
              <button
                type="button"
                className="sm:hidden text-xs font-medium text-blue-600"
                onClick={handleToggleActions}
                aria-expanded={isActive}
              >
                Actions
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-gray-800">Stack</dt>
                <dd>{project.stack.join(', ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-800">Year</dt>
                <dd>{project.year}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-800">Type</dt>
                <dd className="capitalize">{project.type}</dd>
              </div>
              {project.tags.length > 0 && (
                <div>
                  <dt className="font-semibold text-gray-800">Tags</dt>
                  <dd className="flex flex-wrap gap-1">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            <div className="hidden gap-3 sm:flex">
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={() => onOpen(project)}
              >
                Open
              </button>
              <button
                type="button"
                className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                onClick={() => onCompare(project)}
                aria-pressed={isSelectedForCompare}
              >
                {isSelectedForCompare ? 'Remove from compare' : 'Compare'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [compareSelection, setCompareSelection] = useState<Project[]>([]);
  const [activeSwipe, setActiveSwipe] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/projects.json')
      .then((r) => r.json())
      .then((data) => setProjects(data as Project[]))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

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

  const handleOpen = (project: Project) => {
    const url = project.demo || project.repo;
    if (!url) return;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCompare = (project: Project) => {
    setCompareSelection((prev) => {
      const exists = prev.find((p) => p.id === project.id);
      if (exists) {
        return prev.filter((p) => p.id !== project.id);
      }
      if (prev.length === 2) {
        return [prev[1], project];
      }
      return [...prev, project];
    });
  };

  return (
    <div className="p-4 space-y-4 text-black">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search projects"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <div className="aspect-video w-full rounded-md bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            ))
          : filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isActive={activeSwipe === p.id}
                onOpen={handleOpen}
                onCompare={handleCompare}
                onSwipeOpen={() => setActiveSwipe(p.id)}
                onSwipeClose={() => setActiveSwipe((current) => (current === p.id ? null : current))}
                isSelectedForCompare={compareSelection.some((item) => item.id === p.id)}
              />
            ))}
      </div>
      {!loading && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed bg-white/60 p-6 text-center text-sm text-gray-600">
          <p className="font-medium text-gray-800">No projects match your filters.</p>
          <p>
            Try clearing the search or deselecting a few tags to explore the full catalog.
          </p>
        </div>
      )}
      {compareSelection.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Compare selection</h2>
          {compareSelection.length === 1 ? (
            <p className="text-sm text-gray-600">
              {compareSelection[0].title} is ready. Swipe another project and tap compare to see them side-by-side.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {compareSelection.map((project) => (
                <div key={project.id} className="rounded-md border p-3 text-sm text-gray-700">
                  <h3 className="text-base font-semibold text-gray-900">{project.title}</h3>
                  <p className="mt-1 text-gray-600">{project.description}</p>
                  <dl className="mt-3 space-y-1">
                    <div>
                      <dt className="font-medium text-gray-800">Stack</dt>
                      <dd>{project.stack.join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-800">Highlights</dt>
                      <dd>{project.tags.join(', ')}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
