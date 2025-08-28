import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';

const GITHUB_USER = 'Alex-Unnippillil';

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [display, setDisplay] = useState([]);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [techs, setTechs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [difficulties, setDifficulties] = useState([]);
  const [dates, setDates] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [columns, setColumns] = useState(1);
  const itemRefs = useRef([]);
  const preloaded = useRef(new Set());
  itemRefs.current = [];

  const prefetchImage = (src) => {
    if (preloaded.current.has(src)) return;
    const img = new Image();
    img.src = src;
    preloaded.current.add(src);
  };

  const renderChips = (items, current, type) => (
    <>
      <button
        onClick={() => onChipClick(type, '')}
        className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          current === '' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
        }`}
        aria-pressed={current === ''}
      >
        All
      </button>
      {items.map((t) => (
        <button
          key={t}
          onClick={() => onChipClick(type, t)}
          className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            current === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
          }`}
          aria-pressed={current === t}
        >
          {t}
        </button>
      ))}
    </>
  );

  const applyFilter = (type, value) => {
    if (type === 'tech') setFilter(value);
    if (type === 'role') setRoleFilter(value);
    if (type === 'difficulty') setDifficultyFilter(value);
    if (type === 'date') setDateFilter(value);
  };

  const onChipClick = (type, value) => {
    applyFilter(type, value);
    window.dispatchEvent(
      new CustomEvent('cross-filter', { detail: { type, value } })
    );
  };

  useEffect(() => {
    const handler = (e) => {
      const { type, value } = e.detail || {};
      applyFilter(type, value);
    };
    window.addEventListener('cross-filter', handler);
    return () => window.removeEventListener('cross-filter', handler);
  }, []);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
    if (typeof window !== 'undefined') {
      setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const w = window.innerWidth;
      setColumns(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=9`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
            },
          }
        );
        const data = await res.json();
        const mapped = data.map((repo) => {
          const topics = repo.topics || [];
          const year = repo.created_at
            ? new Date(repo.created_at).getFullYear().toString()
            : '';
          const role = topics.find((t) =>
            ['frontend', 'backend', 'fullstack', 'devops'].includes(t)
          );
          const difficulty = topics.find((t) =>
            ['beginner', 'intermediate', 'advanced'].includes(t)
          );
          return {
            id: repo.id,
            title: repo.name,
            description: repo.description || 'No description provided.',
            image: `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repo.name}`,
            tech: [repo.language].filter(Boolean),
            role,
            difficulty,
            date: year,
            live: repo.homepage,
            repo: repo.html_url,
          };
        });
        setProjects(mapped);
        setDisplay(mapped);
        setTechs([...new Set(mapped.flatMap((p) => p.tech))]);
        setRoles([...new Set(mapped.map((p) => p.role).filter(Boolean))]);
        setDifficulties([
          ...new Set(mapped.map((p) => p.difficulty).filter(Boolean)),
        ]);
        setDates([...new Set(mapped.map((p) => p.date).filter(Boolean))]);
        setAriaMessage(`Showing ${mapped.length} projects`);
      } catch (err) {
        console.error('Failed to load repos', err);
      }
    };
    fetchRepos();
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    const id = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (id) {
      const proj = projects.find((p) => p.id.toString() === id);
      if (proj) setSelected(proj);
    }
  }, [projects]);

  const updateDisplay = useCallback(
    (tech, role, difficulty, date, query) => {
      let filtered = projects;
      if (tech) filtered = filtered.filter((p) => p.tech.includes(tech));
      if (role) filtered = filtered.filter((p) => p.role === role);
      if (difficulty)
        filtered = filtered.filter((p) => p.difficulty === difficulty);
      if (date) filtered = filtered.filter((p) => p.date === date);
      if (query)
        filtered = filtered.filter((p) =>
          p.title.toLowerCase().includes(query.toLowerCase())
        );
      const filters = [tech, role, difficulty, date]
        .filter(Boolean)
        .join(', ');
      setAriaMessage(
        `Showing ${filtered.length} project${
          filtered.length === 1 ? '' : 's'
        }${filters ? ` filtered by ${filters}` : ''}${
          query ? ` matching "${query}"` : ''
        }`
      );
      setDisplay((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          const next = [];
          filtered.forEach((p) => {
            if (map.has(p.id)) {
              next.push({ ...map.get(p.id), status: 'entered' });
              map.delete(p.id);
            } else {
              next.push({
                ...p,
                status: prefersReducedMotion ? 'entered' : 'entering',
              });
            }
          });
          map.forEach((p) => {
            next.push({
              ...p,
              status: prefersReducedMotion ? 'exited' : 'exiting',
            });
          });
          return next.filter((p) => p.status !== 'exited');
        });
    },
    [projects, prefersReducedMotion]
  );

  useEffect(() => {
    updateDisplay(filter, roleFilter, difficultyFilter, dateFilter, search);
  }, [filter, roleFilter, difficultyFilter, dateFilter, search, projects, updateDisplay]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    display.forEach((p) => {
      if (p.status === 'entering') {
        requestAnimationFrame(() => {
          setDisplay((curr) =>
            curr.map((c) => (c.id === p.id ? { ...c, status: 'entered' } : c))
          );
        });
      }
    });
    if (display.some((p) => p.status === 'exiting')) {
      const timeout = setTimeout(() => {
        setDisplay((curr) => curr.filter((p) => p.status !== 'exiting'));
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [display, prefersReducedMotion]);

  const motionClass = prefersReducedMotion
    ? ''
    : 'transition transform duration-300 ease-out';

  const handleKeyDown = (e, index, project) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected(project);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      itemRefs.current[index + 1]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      itemRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      itemRefs.current[index + columns]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      itemRefs.current[index - columns]?.focus();
    }
  };

  useEffect(() => {
    if (!selected) return;
    const handle = (e) => {
      if (e.key === 'Escape') {
        setSelected(null);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = display.findIndex((p) => p.id === selected.id);
        if (e.key === 'ArrowRight') {
          const next = display[(idx + 1) % display.length];
          setSelected(next);
          itemRefs.current[(idx + 1) % display.length]?.focus();
        } else {
          const prev = display[(idx - 1 + display.length) % display.length];
          setSelected(prev);
          itemRefs.current[(idx - 1 + display.length) % display.length]?.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [selected, display]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selected) {
      window.location.hash = selected.id;
    } else if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [selected]);

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-ub-cool-grey text-white">
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {projects.length === 0 ? (
        <p className="text-center">Loading projects...</p>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            className="mb-4 w-full px-2 py-1 rounded text-black"
            aria-label="Search projects"
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {renderChips(techs, filter, 'tech')}
          </div>
          {roles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {renderChips(roles, roleFilter, 'role')}
            </div>
          )}
          {difficulties.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {renderChips(difficulties, difficultyFilter, 'difficulty')}
            </div>
          )}
          {dates.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {renderChips(dates, dateFilter, 'date')}
            </div>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {display.map((project, index) => (
              <div
                key={project.id}
                ref={(el) => (itemRefs.current[index] = el)}
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, index, project)}
                onMouseEnter={() => prefetchImage(project.image)}
                className={`mb-4 break-inside-avoid rounded-md bg-ub-grey bg-opacity-20 border border-gray-700 overflow-hidden flex flex-col opacity-100 translate-y-0 ${
                  project.status === 'entering'
                    ? 'opacity-0 translate-y-2'
                    : ''
                } ${
                  project.status === 'exiting'
                    ? 'opacity-0 -translate-y-2'
                    : ''
                } ${motionClass}`}
              >
                <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover"
                    sizes="100%"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="text-lg font-semibold">{project.title}</h3>
                  <p className="text-sm text-gray-200 mt-1 flex-grow">
                    {project.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.tech.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded bg-gray-700 text-white"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {project.live && (
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Live Demo
                      </a>
                    )}
                    {project.repo && (
                      <a
                        href={project.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm border border-blue-600 rounded text-white hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Repo
                      </a>
                    )}
                    <button
                      onClick={() => setSelected(project)}
                      className="px-3 py-1 text-sm border border-gray-500 rounded text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {selected && (
            <div
              className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
              role="dialog"
              aria-modal="true"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 px-2 py-1 bg-gray-700 rounded"
              >
                Close
              </button>
              <div className="max-w-4xl w-full flex flex-col items-center gap-4">
                <Image
                  src={selected.image}
                  alt={selected.title}
                  width={800}
                  height={600}
                  className="w-full h-auto object-contain"
                />
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">{selected.title}</h2>
                  <p className="mb-2">{selected.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2 justify-center">
                    {selected.tech.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded bg-gray-700 text-white"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-center">
                    {selected.live && (
                      <a
                        href={selected.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
                      >
                        Live Demo
                      </a>
                    )}
                    {selected.repo && (
                      <a
                        href={selected.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm border border-blue-600 rounded text-white hover:bg-blue-600 hover:text-white"
                      >
                        Repo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

