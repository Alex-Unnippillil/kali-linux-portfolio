'use client';

import { useRouter } from 'next/router';
import type { TouchEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import FilterChip from '../components/FilterChip';

const TagIcon = () => (
  <svg
    className="h-4 w-4"
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
    className="h-4 w-4"
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
    className="h-4 w-4"
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
    className="h-4 w-4"
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
    className="h-4 w-4"
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

const CloseIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
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

type SummaryItem =
  | { type: 'stack'; label: string }
  | { type: 'tag'; label: string }
  | { type: 'year'; label: string }
  | { type: 'type'; label: string };

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
    <div className="relative h-full">
      <div className="absolute inset-y-0 right-0 flex w-40 bg-[var(--kali-control)] text-slate-900 shadow-[inset_1px_0_0_rgba(255,255,255,0.18)] sm:hidden">
        <button
          type="button"
          className="w-1/2 border-r border-black/10 px-3 text-sm font-medium transition hover:bg-[color-mix(in_srgb,var(--kali-control)_82%,#000000)]"
          onClick={() => {
            onOpen(project);
            onSwipeClose();
          }}
        >
          Open
        </button>
        <button
          type="button"
          className="w-1/2 px-3 text-sm font-medium transition hover:bg-[color-mix(in_srgb,var(--kali-control)_82%,#000000)]"
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
        className="flex h-full flex-col overflow-hidden rounded-xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] shadow-kali-panel transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row">
          <div className="sm:w-52 sm:flex-none">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--kali-panel-highlight)]">
              <img src={project.thumbnail} alt={project.title} className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white sm:text-xl">{project.title}</h3>
                <p className="text-sm text-white/70 sm:text-base">{project.description}</p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-kali-control transition sm:hidden hover:text-white"
                onClick={handleToggleActions}
                aria-expanded={isActive}
              >
                Actions
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm text-white/70 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-white">Stack</dt>
                <dd>{project.stack.join(', ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">Year</dt>
                <dd>{project.year}</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">Type</dt>
                <dd className="capitalize">{project.type}</dd>
              </div>
              {project.tags.length > 0 && (
                <div>
                  <dt className="font-semibold text-white">Tags</dt>
                  <dd className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--kali-panel-highlight)] px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-white/80"
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
                className="rounded-md bg-[var(--kali-control)] px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(15,148,210,0.25)] transition hover:bg-[color-mix(in_srgb,var(--kali-control)_85%,#000000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                onClick={() => onOpen(project)}
              >
                Open
              </button>
              <button
                type="button"
                data-testid={`compare-${project.id}`}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                  isSelectedForCompare
                    ? 'border-transparent bg-[var(--kali-control)] text-slate-900 shadow-[0_0_18px_rgba(15,148,210,0.35)]'
                    : 'border-[color:var(--kali-panel-border)] text-kali-control hover:border-[color:var(--kali-control)] hover:bg-[var(--kali-control-surface)] hover:text-white'
                }`}
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
  const [spotlightIndex, setSpotlightIndex] = useState(0);

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

  const spotlightProjects = useMemo(
    () => projects.slice(0, 5),
    [projects]
  );
  const spotlight = spotlightProjects[spotlightIndex] ?? spotlightProjects[0];

  const stats = useMemo(
    () => ({
      total: projects.length,
      visible: filtered.length,
      latestYear: projects.length ? Math.max(...projects.map((p) => p.year)) : 0,
      stacks: new Set(projects.flatMap((p) => p.stack)).size,
    }),
    [filtered.length, projects]
  );

  useEffect(() => {
    setSpotlightIndex(0);
  }, [spotlightProjects.length]);

  const filterSummary = useMemo<SummaryItem[]>(
    () => [
      ...tech.map((label) => ({ type: 'stack' as const, label })),
      ...tags.map((label) => ({ type: 'tag' as const, label })),
      ...(year ? [{ type: 'year' as const, label: year }] : []),
      ...(type ? [{ type: 'type' as const, label: type }] : []),
    ],
    [tech, tags, year, type]
  );

  const hasActiveFilters = filterSummary.length > 0;

  const handleRemoveFilter = (item: SummaryItem) => {
    switch (item.type) {
      case 'stack':
        setTech((current) => current.filter((entry) => entry !== item.label));
        break;
      case 'tag':
        setTags((current) => current.filter((entry) => entry !== item.label));
        break;
      case 'year':
        setYear('');
        break;
      case 'type':
        setType('');
        break;
      default:
        break;
    }
  };

  const handleClearFilters = () => {
    setTech([]);
    setTags([]);
    setYear('');
    setType('');
  };

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

  const handleResetComparison = () => {
    setCompareSelection([]);
  };

  const handleStartCompare = () => {
    if (compareSelection.length !== 2) return;
    const summary = compareSelection.map((project) => project.title).join(' vs ');
    console.info(`Comparing projects: ${summary}`);
  };

  return (
    <div className="relative text-[var(--color-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 pb-32 sm:p-6 lg:p-8">
        <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white/80">Active filters</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm font-semibold text-kali-control transition hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {hasActiveFilters ? (
              filterSummary.map((item) => (
                <button
                  key={`${item.type}-${item.label}`}
                  type="button"
                  onClick={() => handleRemoveFilter(item)}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--kali-panel-border)] bg-[var(--kali-control-surface)] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[color:var(--kali-control)] hover:bg-[var(--kali-control-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  <span className="flex items-center gap-1.5 text-kali-control">
                    {item.type === 'stack' && <StackIcon />}
                    {item.type === 'tag' && <TagIcon />}
                    {item.type === 'year' && <CalendarIcon />}
                    {item.type === 'type' && <TypeIcon />}
                    <span className="text-white">{item.label}</span>
                  </span>
                  <span className="sr-only">Remove filter</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-white/70">
                No filters selected. Use the chips below to add tags, stacks, or years.
              </p>
            )}
          </div>
        </div>
        {spotlight && (
          <section className="grid gap-4 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-4 shadow-kali-panel sm:p-5 lg:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-4 sm:flex-row">
              <img
                src={spotlight.thumbnail}
                alt={spotlight.title}
                className="h-44 w-full rounded-xl object-cover sm:w-52"
              />
              <div className="flex-1 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-kali-control">Project spotlight</p>
                <h2 className="text-lg font-semibold text-white sm:text-xl">{spotlight.title}</h2>
                <p className="text-sm text-white/70">{spotlight.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-white/60">
                  <span>{spotlight.year}</span>
                  <span>•</span>
                  <span className="capitalize">{spotlight.type}</span>
                  <span>•</span>
                  <span>{spotlight.stack.join(', ')}</span>
                </div>
                <div className="flex flex-wrap gap-3 pt-2 text-sm">
                  {spotlight.repo && (
                    <button
                      type="button"
                      onClick={() => handleOpen(spotlight)}
                      className="rounded-md bg-[var(--kali-control)] px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(15,148,210,0.25)] transition hover:bg-[color-mix(in_srgb,var(--kali-control)_85%,#000000)]"
                    >
                      Open link
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setSpotlightIndex(
                        (spotlightIndex - 1 + spotlightProjects.length) % spotlightProjects.length
                      )
                    }
                    className="rounded-md border border-[color:var(--kali-panel-border)] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-[var(--kali-panel-highlight)]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpotlightIndex((spotlightIndex + 1) % spotlightProjects.length)}
                    className="rounded-md border border-[color:var(--kali-panel-border)] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-[var(--kali-panel-highlight)]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] p-4 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Gallery stats</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Projects listed</span>
                  <span className="font-semibold text-white">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Visible now</span>
                  <span className="font-semibold text-white">{stats.visible}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Stacks covered</span>
                  <span className="font-semibold text-white">{stats.stacks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Latest year</span>
                  <span className="font-semibold text-white">{stats.latestYear || '—'}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-white/50">
                Tip: use the chips below to refine by stack, tags, or project type.
              </p>
            </div>
          </section>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
            className="w-full max-w-xs rounded-lg border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-3 py-2 text-sm text-white shadow-sm transition placeholder:text-white/40 focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--kali-control)_35%,transparent)]"
          />
          <FilterChip
            label="Playable"
            active={demoOnly}
            onClick={() => setDemoOnly(!demoOnly)}
            icon={<PlayIcon />}
          />
        </div>
        <div className="flex flex-wrap gap-3">
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
        <div className="flex flex-wrap gap-3">
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
        <div className="flex flex-wrap gap-3">
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
        <div className="flex flex-wrap gap-3">
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-4 rounded-xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-5 shadow-kali-panel"
                >
                  <div className="aspect-[4/3] w-full rounded-lg bg-[var(--kali-panel-highlight)]" />
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-[var(--kali-panel-highlight)]" />
                    <div className="h-3 w-2/3 rounded bg-[var(--kali-panel-highlight)]" />
                    <div className="h-3 w-1/2 rounded bg-[var(--kali-panel-highlight)]" />
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
          <div className="rounded-xl border border-dashed border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] p-8 text-center text-sm text-white/70 shadow-kali-panel">
            <p className="text-base font-semibold text-white">No projects match your filters.</p>
            <p className="mt-2 leading-relaxed">
              Use the filter chips above to add or remove stacks, tags, or years and rediscover the full catalog.
            </p>
          </div>
        )}
      </div>
      {compareSelection.length > 0 && (
        <div
          role="region"
          aria-label="Comparison tray"
          className="fixed bottom-6 left-4 right-4 z-30 max-w-full rounded-xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] text-[var(--color-text)] shadow-kali-panel backdrop-blur sm:left-auto sm:right-6 sm:w-full sm:max-w-sm"
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-white">Comparison tray</p>
              <p className="mt-1 text-xs text-white/70">
                {compareSelection.length === 2
                  ? 'Ready to compare your selected projects.'
                  : 'Select one more project to enable comparison.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetComparison}
              aria-label="Dismiss comparison tray"
              className="rounded-full border border-[color:var(--kali-panel-border)] p-1.5 text-white/70 transition hover:border-[color:var(--kali-control)] hover:bg-[var(--kali-panel-highlight)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              <CloseIcon />
            </button>
          </div>
          <ul className="divide-y divide-[color:var(--kali-panel-border)]">
            {compareSelection.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm text-white/80"
              >
                <span className="font-medium text-white">{project.title}</span>
                <button
                  type="button"
                  onClick={() => handleCompare(project)}
                  aria-label={`Remove ${project.title} from comparison`}
                  className="rounded-full border border-transparent p-1.5 text-white/60 transition hover:border-[color:var(--kali-control)] hover:bg-[var(--kali-panel-highlight)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 border-t border-[color:var(--kali-panel-border)] px-5 py-4">
            <button
              type="button"
              className="flex-1 rounded-md bg-[var(--kali-control)] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(15,148,210,0.25)] transition hover:bg-[color-mix(in_srgb,var(--kali-control)_85%,#000000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:bg-[var(--kali-control-surface)] disabled:text-white/50"
              onClick={handleStartCompare}
              disabled={compareSelection.length !== 2}
            >
              Compare projects
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-[color:var(--kali-panel-border)] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-[var(--kali-panel-highlight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
              onClick={handleResetComparison}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
