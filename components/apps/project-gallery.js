import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';

const GITHUB_USER = 'Alex-Unnippillil';

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export default function ProjectGallery() {
  const [projects, setProjects] = useState([]);
  const [display, setDisplay] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [techs, setTechs] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    ReactGA.event({ category: 'Application', action: 'Loaded Project Gallery' });
    if (typeof window !== 'undefined') {
      setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }
  }, []);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=9`
        );
        const data = await res.json();
        const mapped = data.map((repo) => ({
          id: repo.id,
          title: repo.name,
          description: repo.description || 'No description provided.',
          image: `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repo.name}`,
          tech: [repo.language].filter(Boolean),
          live: repo.homepage,
          repo: repo.html_url,
        }));
        setProjects(mapped);
        setDisplay(mapped);
        setTechs([
          ...new Set(mapped.flatMap((p) => p.tech)),
        ]);
        setAriaMessage(`Showing ${mapped.length} projects`);
      } catch (err) {
        console.error('Failed to load repos', err);
      }
    };
    fetchRepos();
  }, []);

  const updateDisplay = useCallback(
    (selectedFilter, query) => {
      const byTech = selectedFilter
        ? projects.filter((p) => p.tech.includes(selectedFilter))
        : projects;
      const filtered = query
        ? byTech.filter((p) =>
            p.title.toLowerCase().includes(query.toLowerCase())
          )
        : byTech;
      setAriaMessage(
        `Showing ${filtered.length} project${
          filtered.length === 1 ? '' : 's'
        }${selectedFilter ? ` filtered by ${selectedFilter}` : ''}${
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
            next.push({ ...p, status: prefersReducedMotion ? 'entered' : 'entering' });
          }
        });
        map.forEach((p) => {
          next.push({ ...p, status: prefersReducedMotion ? 'exited' : 'exiting' });
        });
        return next.filter((p) => p.status !== 'exited');
      });
    },
    [projects, prefersReducedMotion]
  );

  useEffect(() => {
    updateDisplay(filter, search);
  }, [filter, search, projects, updateDisplay]);

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
            <FilterChip
              label="All"
              active={filter === ''}
              onClick={() => setFilter('')}
            />
            {techs.map((t) => (
              <FilterChip
                key={t}
                label={t}
                active={filter === t}
                onClick={() => setFilter(t)}
              />
            ))}
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {display.map((project) => (
              <div
                key={project.id}
                data-testid={`project-card-${project.id}`}
                onMouseEnter={() => setHovered(project.id)}
                onMouseLeave={() => setHovered(null)}
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
                  />
                  {hovered === project.id && (
                    <div
                      data-testid={`preview-${project.id}`}
                      aria-hidden="true"
                      className="absolute inset-0 bg-black bg-opacity-70 text-white p-3 flex flex-col justify-center"
                    >
                      <h4 className="text-base font-semibold">{project.title}</h4>
                      <p className="mt-1 text-xs">{project.description}</p>
                    </div>
                  )}
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
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
              role="dialog"
            >
              <div className="bg-ub-cool-grey text-white p-4 rounded w-full max-w-md">
                <button
                  onClick={() => setSelected(null)}
                  className="mb-2 px-2 py-1 bg-gray-700 rounded"
                >
                  Close
                </button>
                <h2 className="text-xl font-semibold mb-2">{selected.title}</h2>
                <p className="mb-2">{selected.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selected.tech.map((t, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded bg-gray-700 text-white"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
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
          )}
        </>
      )}
    </div>
  );
}

