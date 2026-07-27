import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import usePersistentState from '../../hooks/usePersistentState';

const sortStrategies = {
  newest: {
    label: 'Newest first',
    sorter: (a, b) => b.year - a.year,
  },
  oldest: {
    label: 'Oldest first',
    sorter: (a, b) => a.year - b.year,
  },
  alphabetical: {
    label: 'Alphabetical',
    sorter: (a, b) => a.title.localeCompare(b.title),
  },
};

function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
        active
          ? 'border-transparent bg-[var(--kali-control)] text-slate-900 shadow-[0_12px_30px_rgba(15,148,210,0.45)]'
          : 'border-white/10 bg-white/5 text-white/80 hover:border-[var(--kali-control)] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function ProjectCard({ project, index }) {
  const hasDemo = Boolean(project.demo);
  const hasRepo = Boolean(project.repo);

  return (
    <article
      className="group relative mb-6 break-inside-avoid overflow-hidden rounded-2xl border border-white/5 bg-[var(--kali-panel)] p-5 text-white shadow-[0_20px_45px_rgba(10,10,45,0.35)] transition duration-500 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-white/5 before:opacity-0 before:transition before:duration-500 before:content-[''] hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(15,148,210,0.25)] hover:before:opacity-100 focus-within:-translate-y-1 focus-within:shadow-[0_30px_60px_rgba(15,148,210,0.25)] focus-within:before:opacity-100"
      style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={project.thumbnail}
          alt={project.title}
          className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 flex translate-y-6 flex-wrap items-center justify-center gap-3 pb-4 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {hasDemo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[var(--kali-control)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-[0_12px_30px_rgba(15,148,210,0.35)] transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              Live demo
            </a>
          )}
          {hasRepo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition duration-200 hover:border-[var(--kali-control)] hover:text-[var(--kali-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              View repo
            </a>
          )}
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--kali-control)]">
            {project.type} · {project.year}
          </p>
          <h3 className="text-xl font-semibold text-white">{project.title}</h3>
          <p className="text-sm leading-relaxed text-white/70">{project.description}</p>
        </header>
        <div className="flex flex-wrap gap-2 text-xs text-white/60">
          {project.stack.map((item) => (
            <span
              key={`${project.id}-stack-${item}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold uppercase tracking-wide"
            >
              {item}
            </span>
          ))}
        </div>
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-white/60">
            {project.tags.map((tag) => (
              <span
                key={`${project.id}-tag-${tag}`}
                className="rounded-full border border-transparent bg-[color-mix(in_srgb,var(--kali-control)_15%,transparent)] px-3 py-1 font-semibold text-[var(--kali-control)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function ProjectGalleryPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [didMount, setDidMount] = useState(false);
  const [search, setSearch] = usePersistentState('pg-search', '');
  const [selectedStacks, setSelectedStacks] = usePersistentState('pg-stacks', []);
  const [selectedTags, setSelectedTags] = usePersistentState('pg-tags', []);
  const [selectedType, setSelectedType] = usePersistentState('pg-type', 'all');
  const [sortOrder, setSortOrder] = usePersistentState('pg-sort', 'newest');
  const [demoOnly, setDemoOnly] = usePersistentState('pg-demo-only', false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/data/projects.json')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load projects');
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        setProjects(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {
        if (!active) return;
        setProjects([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDidMount(true), 120);
    return () => clearTimeout(timer);
  }, []);

  const stacks = useMemo(
    () => Array.from(new Set(projects.flatMap((item) => item.stack))).sort(),
    [projects],
  );
  const tags = useMemo(
    () => Array.from(new Set(projects.flatMap((item) => item.tags))).sort(),
    [projects],
  );
  const types = useMemo(
    () => Array.from(new Set(projects.map((item) => item.type))).sort(),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const currentSort = sortStrategies[sortOrder] ?? sortStrategies.newest;

    return projects
      .filter((project) => {
        if (demoOnly && !project.demo) return false;
        if (selectedType !== 'all' && project.type !== selectedType) return false;
        if (selectedStacks.length && !selectedStacks.every((entry) => project.stack.includes(entry))) {
          return false;
        }
        if (selectedTags.length && !selectedTags.every((entry) => project.tags.includes(entry))) {
          return false;
        }
        if (!normalizedSearch) return true;
        const haystack = `${project.title} ${project.description}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort(currentSort.sorter);
  }, [projects, demoOnly, selectedType, selectedStacks, selectedTags, search, sortOrder]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    selectedStacks.length > 0 ||
    selectedTags.length > 0 ||
    (selectedType !== 'all' && selectedType) ||
    demoOnly;

  const handleToggleStack = (stack) => {
    setSelectedStacks((current) =>
      current.includes(stack) ? current.filter((item) => item !== stack) : [...current, stack],
    );
  };

  const handleToggleTag = (tag) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStacks([]);
    setSelectedTags([]);
    setSelectedType('all');
    setDemoOnly(false);
  };

  return (
    <>
      <Head>
        <title>Project gallery | Kali Linux Portfolio</title>
      </Head>
      <main className="min-h-screen bg-[var(--kali-bg)] text-[var(--color-text)]">
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
          <header
            className={`space-y-4 transition-all duration-700 ${
              didMount ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--kali-control)]">
              curated showcase
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Project gallery</h1>
            <p className="max-w-2xl text-sm text-white/70">
              Browse through a curated grid of experiments, client work, and open-source tools. Filter by stack, tag, or format
              and pick the view that works for you—your selections persist so you can pick up right where you left off.
            </p>
          </header>

          <div
            className={`mt-10 space-y-8 rounded-2xl border border-white/5 bg-[var(--kali-panel)]/80 p-6 shadow-[0_16px_45px_rgba(8,30,65,0.45)] backdrop-blur transition-all duration-700 ${
              didMount ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-end">
              <div className="flex w-full flex-col gap-2 text-sm font-semibold text-white/80">
                <label htmlFor="project-gallery-search-input">Search</label>
                <input
                  id="project-gallery-search-input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or description"
                  aria-label="Search projects"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition duration-200 placeholder:text-white/40 focus:border-[var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-control)]/70"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                  <input
                    id="project-gallery-demo-toggle"
                    type="checkbox"
                    checked={demoOnly}
                    onChange={(event) => setDemoOnly(event.target.checked)}
                    aria-label="Limit results to projects with live demos"
                    className="h-4 w-4 rounded border-white/10 bg-white/10 text-[var(--kali-control)] focus:ring-[var(--kali-control)]"
                  />
                  <label htmlFor="project-gallery-demo-toggle" className="cursor-pointer">
                    Demo ready only
                  </label>
                </div>
                <div className="ml-auto w-full max-w-[180px]">
                  <label htmlFor="project-gallery-sort-select" className="sr-only">
                    Sort projects
                  </label>
                  <select
                    id="project-gallery-sort-select"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition duration-200 focus:border-[var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-control)]/70"
                  >
                    {Object.entries(sortStrategies).map(([value, option]) => (
                      <option key={value} value={value} className="bg-[var(--kali-panel)] text-slate-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {stacks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/60">
                  <span>Stacks</span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[var(--kali-control)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {stacks.map((stack) => (
                    <FilterPill
                      key={stack}
                      active={selectedStacks.includes(stack)}
                      onClick={() => handleToggleStack(stack)}
                    >
                      {stack}
                    </FilterPill>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/60">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <FilterPill
                      key={tag}
                      active={selectedTags.includes(tag)}
                      onClick={() => handleToggleTag(tag)}
                    >
                      #{tag}
                    </FilterPill>
                  ))}
                </div>
              </div>
            )}

            {types.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                <span>Format</span>
                <FilterPill active={selectedType === 'all'} onClick={() => setSelectedType('all')}>
                  All
                </FilterPill>
                {types.map((type) => (
                  <FilterPill
                    key={type}
                    active={selectedType === type}
                    onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                  >
                    {type}
                  </FilterPill>
                ))}
              </div>
            )}
          </div>

          <div className="mt-12">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[var(--kali-panel)]/60"
                  />
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="columns-1 gap-6 sm:columns-2 xl:columns-3">
                {filteredProjects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-[var(--kali-panel)]/70 p-12 text-center text-sm text-white/70 shadow-[0_16px_40px_rgba(8,30,65,0.35)]">
                <p className="text-base font-semibold text-white">No matches just yet</p>
                <p className="max-w-lg leading-relaxed">
                  Try adjusting the filters above or clearing them entirely. The gallery will animate new results into place as soon
                  as a project matches your selections.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition duration-200 hover:border-[var(--kali-control)] hover:text-[var(--kali-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
